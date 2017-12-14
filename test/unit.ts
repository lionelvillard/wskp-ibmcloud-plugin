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

import * as ibmcloud from '../ibm';
import { suite, test, slow, timeout } from 'mocha-typescript';
import * as assert from 'assert';
import * as wskd from 'openwhisk-deploy';
import { ResourceStatus } from 'openwhisk-deploy';

@suite('IBM cloud services - Unit')
class Unit {

    config;

    async before() {
        this.config = wskd.init.newConfig(null, process.env.LOGGER_LEVEL || 'off');
        await wskd.init.init(this.config);
    }

    @test('Should provision an IBM cloud space named wskp-space-ibmcloud-test-ci')
    async ibmspace() {
        await wskd.bx.deleteSpace(this.config, { space: 'dev' }, 'wskp-space-ibmcloud-test-ci');

        const result = ibmcloud.resourceContributor(this.config, 'wskp-space-ibmcloud-test-ci', {
            type: 'ibm_space',
            org: process.env.BLUEMIX_ORG,
            managed: true
        });
        assert.ok(result);
        await wskd.waitForAllTasks();
        assert.ok((result[0].body.space_guid as wskd.Task<string>).resolved);

        await wskd.bx.deleteSpace(this.config, { space: 'dev' }, 'wskp-space-ibmcloud-test-ci');
    }

    @test('Should raise an error trying to import a non-existing IBM cloud space')
    async ibmspaceNoExist() {
        const result = ibmcloud.resourceContributor(this.config, 'wskp-dev-ci-that-does-not-exist', {
            type: 'ibm_space',
            org: process.env.BLUEMIX_ORG,
        });
        try {
            assert.ok(result);
            await wskd.waitForAllTasks();
            assert.ok(false);
        } catch (e) {
            assert.ok((result[0].body.space_guid as wskd.Task<string>).reason);
        }
    }

    @test('Should import import an existing IBM cloud space')
    async ibmspaceImport() {
        await wskd.bx.deleteSpace(this.config, { space: 'dev' }, 'wskp-space-ibmcloud-test-ci');

        const result = ibmcloud.resourceContributor(this.config, 'wskp-space-ibmcloud-test-ci', {
            type: 'ibm_space',
            org: process.env.BLUEMIX_ORG,
        });
        assert.ok(result);
        await wskd.waitForAllTasks();
        assert.ok((result[0].body.space_guid as wskd.Task<string>).resolved);

        await wskd.bx.deleteSpace(this.config, { space: 'dev' }, 'wskp-space-ibmcloud-test-ci');
    }

    @test('Should raise an error when service space does not exist')
    async cloudantServiceNoSpace() {
        this.config.manifest = {
            resources: {}
        };

        const result = ibmcloud.resourceContributor(this.config, 'wskp-cloudant-ci', {
            type: 'ibm_service_instance',
            service: 'cloudant',
            space: 'wskp-dev-ci-that-does-not-exist'
        });
        assert.ok(result);
        try {
            await wskd.waitForAllTasks();
            assert.ok(false);
        } catch (e) {
            assert.ok(true);
            assert.equal(e.message, 'space wskp-dev-ci-that-does-not-exist does not exists');
        }
    }

    @test('Should raise an error when unmanaged service does not exist')
    async cloudantServiceErrorNoExist() {
        const config = wskd.init.newConfigFromJSON({
            resources: {
                'wskp-space-ibmcloud-test-ci': {
                    type: 'ibm_space',
                    org: process.env.BLUEMIX_ORG,
                    managed: true
                },
                'wskp-cloudant-ci-that-does-not-exist': {
                    type: 'ibm_service_instance',
                    space: 'wskp-space-ibmcloud-test-ci',
                    service: 'cloudant',
                }
            }
        }, process.env.LOGGER_LEVEL);
        config.skipPhases = ['validation'];
        await wskd.init.init(config);

        const result = ibmcloud.resourceContributor(config, 'wskp-space-ibmcloud-test-ci', config.manifest.resources['wskp-space-ibmcloud-test-ci']);
        assert.ok(result);

        const result2 = ibmcloud.resourceContributor(config, 'wskp-cloudant-ci-that-does-not-exist', config.manifest.resources['wskp-cloudant-ci-that-does-not-exist']);
        assert.ok(result2);
        try {
            await wskd.waitForAllTasks();
            assert.ok(false);
        } catch (e) {
            assert.ok(e.stdout.includes('not found'));
        }
    }

    @test('Should provision the IBM cloudant service named wskp-cloudant-ibmcloud-ci')
    async cloudantService() {
        const config = wskd.init.newConfigFromJSON({
            resources: {
                'wskp-space-ibmcloud-test-ci': {
                    type: 'ibm_space',
                    org: process.env.BLUEMIX_ORG,
                    managed: true
                },
                'wskp-cloudant-ci': {
                    type: 'ibm_service_instance',
                    space: 'wskp-space-ibmcloud-test-ci',
                    service: 'cloudant',
                    managed: true
                }
            }
        }, process.env.LOGGER_LEVEL);
        config.skipPhases = ['validation'];
        await wskd.init.init(config);

        // Make sure service does not exist
        wskd.bx.deleteService(config, { space: 'wskp-space-ibmcloud-test-ci' }, 'wskp-cloudant-ci');

        try {
            const result = ibmcloud.resourceContributor(config, 'wskp-space-ibmcloud-test-ci', config.manifest.resources['wskp-space-ibmcloud-test-ci']);
            assert.ok(result);

            const result2 = ibmcloud.resourceContributor(config, 'wskp-cloudant-ci', config.manifest.resources['wskp-cloudant-ci']);
            assert.ok(result2);
            await wskd.waitForAllTasks();
            assert.strictEqual(result2[0].body._status, ResourceStatus.PROVISIONED);
            assert.ok(result2[0].body.id);
        } finally {
            // Cleanup
            wskd.bx.deleteService(config, { space: 'wskp-space-ibmcloud-test-ci' }, 'wskp-cloudant-ci');
        }
    }


}