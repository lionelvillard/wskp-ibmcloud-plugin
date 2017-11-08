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
import { IService, IPackage, IConfig, bx, interpolation, ptask, Task, utils } from 'openwhisk-deploy';
import { exec } from 'child-process-promise';
import * as rp from 'request-promise';

// --- Plugin export

export function serviceBindingContributor(config: IConfig, pkgName: string, pkg: IPackage) {
    const service = pkg.service;
    if (typeof service === 'string') {
        // service is an id to a service defined under $.services

        const services = utils.getObject(config.manifest, 'services');
        const servicedef = services ? services[service] : null;
        if (!servicedef)
            config.fatal('service %s does not exist', service);

        pkg.service = servicedef;
    }
    const type = pkg.service.type; // cannot be null

    switch (type) {
        case 'cloudant':
        case 'cloudantNoSQLDB':
            return cloudantBinding(config, pkgName, pkg);
        default:
            config.fatal('Unsupported IBM service type: %s', service);
    }
}

export function serviceContributor(config: IConfig, id: string, service: IService) {
    switch (service.type) {
        case 'cloudant':
        case 'cloudantNoSQLDB':
            return cloudantService(config, id, service as IServiceInstance);
        default:
            config.fatal('Unsupported IBM service type: %s', service);
    }
}

// ---- IBM Cloud provider

export interface IServiceInstance extends IService {
    // The GUID of the space where you want to create the service. You can retrieve the value from data source ibm_space.
    space_guid: string | Task<string>;

    // The name of the service offering. You can retrieve the value by running the bx service offerings command in the Bluemix CLI.
    service: string;

    // The name of the plan type supported by service. You can retrieve the value by running the bx service offerings command in the Bluemix CLI.
    plan: string;

    // Tags associated with the service instance.
    tags?: string[];

    // Arbitrary parameters to pass to the service broker. The value must be a JSON object.
    parameters?: { [key: string]: object };
}

function credential(config: IConfig, id: string, service: IServiceInstance): bx.ICredential {
    const space = service.space;
    if (!space)
        config.fatal('missing space in service id %s', id);

    return {
        endpoint: service.endpoint || 'api.ng.bluemix.net',
        org: service.org, // TODO: compute from space
        space
    };
}

async function getKey(config: IConfig, cred: bx.ICredential, serviceName: string, key: string) {
    try {
        config.logger.info('retrieving service key');
        const keys = await bx.run(config, cred, `service key-show ${serviceName} ${key}`);
        config.logger.debug('bx got keys');
        const trimIdx = keys.stdout.indexOf('{');
        return (trimIdx > 0) ? JSON.parse(keys.stdout.substr(trimIdx)) : null;
    } catch (e) {
        // key does not exist => create
        await bx.run(config, cred, `service key-create ${serviceName} ${key}`);
        return getKey(config, cred, serviceName, key);
    }
}

// ---- cloudant

function cloudantService(config: IConfig, id: string, service: IServiceInstance) {
    service.service = 'cloudantNoSQLDB';
    const cred = credential(config, id, service);

    if (!service.name)
        service.name = id;

    if (!service.plan)
        service.plan = 'Lite';

    service.space_guid = ptask(async () => {
        const process = await bx.run(config, cred, `account space ${cred.space} --guid`);
        return process.stdout.trim();
    }, ['data']);

    return [{
        kind: 'service',
        id,
        body: service
    }];
}

function cloudantBinding(config: IConfig, pkgName: string, pkg: IPackage) {
    const service = pkg.service;

    const cred = credential(config, '', service);

    const suffix = config.envname ? `-${config.envname}` : '';
    const name = config.manifest && config.manifest.name ? config.manifest.name : '';
    const key = pkg.key || `${name}${suffix}`;
    const dbname = pkg.dbname || `${name}${suffix}`;

    const inputs = ptask(async () => {
        const credkey = await getKey(config, cred, service.name, key);
        credkey.dbname = dbname;
        await createCloudantDB(config, credkey);

        console.log(credkey);
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

