"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const openwhisk_deploy_1 = require("openwhisk-deploy");
// --- Plugin export
function serviceContributor(config, pkgName, pkg) {
    return __awaiter(this, void 0, void 0, function* () {
        const service = pkg.service;
        switch (service) {
            case 'ibm-cloudant':
                return cloudantContributor(config, pkgName, pkg);
            default:
                throw `Unsupported IBM service ${service}`;
        }
    });
}
exports.serviceContributor = serviceContributor;
function cloudantContributor(config, pkgName, pkg) {
    return __awaiter(this, void 0, void 0, function* () {
        const cred = {
            endpoint: pkg.endpoint || 'api.ng.bluemix.net',
            org: pkg.org,
            space: pkg.space
        };
        const key = pkg.key;
        const name = pkg.name;
        try {
            const stdout = yield openwhisk_deploy_1.bx.login(config, cred);
            config.logger.debug(`bx logged in: ${stdout}`);
            const keys = yield openwhisk_deploy_1.bx.run(config, cred, `service key-show ${name} ${key}`);
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
            }
            else {
                throw `No service key ${key} found for service instancee ${name} as ${cred.org} in space ${cred.space}`;
            }
        }
        catch (e) {
            console.log(e);
            config.logger.error(e);
            throw e;
        }
    });
}
//# sourceMappingURL=ibm.js.map