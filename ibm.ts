/*
 * Copyright 2017 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { IResource, IPackage, IConfig, bx, interpolation, ptask, Task, utils } from 'openwhisk-deploy';
import { exec } from 'child-process-promise';
import * as rp from 'request-promise';
import { DH_CHECK_P_NOT_SAFE_PRIME } from 'constants';

// --- Plugin export

export function resourceBindingContributor(config: IConfig, pkgName: string, pkg: IPackage) {
    const resource = pkg.resource;
    if (typeof resource === 'string') {
        // service is an id to a service defined under $.resource

        const resources = utils.getObject(config.manifest, 'resources');
        const resourcedef = resources ? resources[resource] : null;
        if (!resourcedef)
            config.fatal('service %s does not exist', resource);

        pkg.resource = resourcedef;
    }
    const type = pkg.resource.type; // cannot be null

    switch (type) {
        case 'ibm_service_instance':
            return serviceBinding(config, pkgName, pkg);
        default:
            config.fatal('Unsupported IBM resource type: %s', type);
    }
}

export function resourceContributor(config: IConfig, id: string, resource: IResource) {
    switch (resource.type) {
        case 'ibm_space':
            return space(config, id, resource as ISpace);
        case 'ibm_service_instance':
            return serviceInstance(config, id, resource as IServiceInstance);
        default:
            config.fatal('Unsupported resource type: %s', resource.type);
    }
}

// ---- Space

interface ISpace extends IResource {
    /** The descriptive name used to identify a space. */
    name: string;

    /** The name of the organization to which this space belongs. */
    org: string;

    /** The space guid (output) */
    guid?: string;
}

function space(config: IConfig, id: string, space: ISpace) {
    const cred = credential(config, space);

    space.space_guid = ptask(async () => {
        try {
            const process = await bx.run(config, cred, `account space ${cred.space} --guid`);
            return process.stdout.trim();
        } catch (e) {
            console.log(e)
        }
    }, ['data']);

    return [{
        kind: 'resource',
        id,
        body: space
    }];
}

// ---- IBM services

interface IServiceInstance extends IResource {
    /*
     * The GUID of the space where you want to create the service. You can retrieve the value from
     * data source ibm_space. space_guid: string | Task<string>;
     */
    service: string;

    /*
     * The name of the plan type supported by service.
     * You can retrieve the value by running the bx service offerings command in the Bluemix CLI.
     */
    plan: string;

    /* Tags associated with the service instance. */
    tags?: string[];

    /* Arbitrary parameters to pass to the service broker. The value must be a JSON object. */
    parameters?: { [key: string]: object };
}

function serviceInstance(config: IConfig, id: string, instance: IServiceInstance) {
    switch (instance.service) {
        case 'cloudant':
        case 'cloudantNoSQLDB':
            return cloudantService(config, id, instance);
        default:
            config.fatal('Unsupported IBM service %s', instance.service);
    }
}

function serviceBinding(config: IConfig, pkgName: string, pkg: IPackage) {
    switch (pkg.resource.service) {
        case 'cloudant':
        case 'cloudantNoSQLDB':
            return cloudantBinding(config, pkgName, pkg);
        default:
            config.fatal('Unsupported IBM service %s', pkg.resource.service);
    }
}

// ---- cloudant

function cloudantService(config: IConfig, id: string, instance: IServiceInstance) {
    instance.service = 'cloudantNoSQLDB'; // normalize

    instance.name = instance.name || id;
    instance.plan = instance.plan || 'Lite';

    instance.output = ptask(async () => {
        const space = await interpolation.fullyEvaluate(config, `self.resources.${instance.space}.space_guid`);
        const cred = credential(config, space);
        const id = await showService(config, cred, instance);
        return {
            id
        }
    });

    return [{
        kind: 'service',
        id,
        body: instance
    }];
}

function cloudantBinding(config: IConfig, pkgName: string, pkg: IPackage) {
    const instance: IServiceInstance = pkg.resource;

    const suffix = config.envname ? `-${config.envname}` : '';
    const name = config.manifest && config.manifest.name ? config.manifest.name : '';
    const key = pkg.key || `${name}${suffix}`;
    const dbname = pkg.dbname || `${name}${suffix}`;

    const inputs = ptask(async () => {
        const space = await interpolation.fullyEvaluate(config, `self.resources.${instance.space}.space_guid`);
        const cred = credential(config, space);

        const credkey = await getKey(config, cred, instance.name, key);
        credkey.dbname = dbname;
        await createCloudantDB(config, credkey);
        return credkey;
    });

    return [{
        kind: 'package',
        name: pkgName,
        body: {
            bind: '/whisk.system/cloudant',
            inputs
        }
    }];
}

async function createCloudantDB(config: IConfig, credkey) {
    config.logger.info(`creating database ${credkey.dbname} (if needed)`);
    try {
        const response = await rp({
            method: 'PUT',
            uri: `${credkey.url}/${credkey.dbname}`,
            auth: {
                user: credkey.username,
                pass: credkey.password
            }
        });

        config.logger.info(`database created (response: ${JSON.stringify(response)})`);
    } catch (e) {
        config.logger.info(`database exist already: ${e.message})`);
    }
}


// -- helpers

function credential(config: IConfig, space: ISpace): bx.ICredential {
    const name = space.name;
    const org = space.org;

    return {
        endpoint: space.endpoint || 'api.ng.bluemix.net',
        org,
        space: name
    };
}

async function getKey(config: IConfig, cred: bx.ICredential, serviceName: string, key: string) {
    try {
        config.logger.info('retrieving service key');
        const keyinfo = await bx.run(config, cred, `service key-show ${serviceName} ${key}`);
        config.logger.debug('bx got key');
        const trimIdx = keyinfo.stdout.indexOf('{');
        return (trimIdx > 0) ? JSON.parse(keyinfo.stdout.substr(trimIdx)) : null;
    } catch (e) {
        // key does not exist => create
        await bx.run(config, cred, `service key-create ${serviceName} ${key}`);
        return getKey(config, cred, serviceName, key);
    }
}

async function showService(config: IConfig, cred: bx.ICredential, instance: IServiceInstance) {
    try {
        config.logger.info(`getting ${instance.name} guid`);
        const guid = await bx.run(config, cred, `service show ${instance.name} --guid`);
        const lines = guid.stdout.split(/\s/g);
        if (lines.length === 3) {
            return lines[2];
        } else {
            config.fatal('malformed guid: %s', guid.stdout);
        }
    } catch (e) {
        if (e.stderr.includes('not found')) {
            try {
                await bx.run(config, cred, `service create ${instance.service} ${instance.plan} ${instance.name}`);
                return showService(config, cred, instance);
            } catch (e2) {
                config.fatal('service %s could not be created: %s', instance.name, e2.stderr);
            }
        }
    }
}
