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

import { bx } from 'openwhisk-deploy';

// --- Plugin export

export async function serviceContributor(config, pkgName: string, pkg) {
    const service = pkg.service;
    switch (service) {
        case 'ibm-cloudant':
            return cloudantContributor(config, pkgName, pkg);
        default:
            throw `Unsupported IBM service ${service}`;
    }
}

async function cloudantContributor(config, pkgName: string, pkg) {

    const cred = {
        endpoint: pkg.endpoint || 'api.ng.bluemix.net',
        org: pkg.org,
        space: pkg.space
    }

    const key = pkg.key;
    const name = pkg.name;

    try {
        const stdout = await bx.login(config, cred);
        config.logger.debug(`bx logged in: ${stdout}`);

        const keys = await bx.run(config, cred, `service key-show ${name} ${key}`);

        config.logger.debug(`bx got keys`);
        const trimIdx = keys.stdout.indexOf('{');
        if (trimIdx > 0) {
            const json = JSON.parse(keys.stdout.substr(trimIdx));

            return [{
                kind: 'package',
                name: pkgName,
                body: {
                    bind: '/whisk.system/cloudant',
                    inputs: json
                }
            }];

        } else {
            throw `No service key ${key} found for service instancee ${name} as ${cred.org} in space ${cred.space}`;
        }
    } catch (e) {
        console.log(e);
        config.logger.error(e);
        throw e;
    }
}
