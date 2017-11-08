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
import * as ibm from '../ibm';
import { suite, test, slow, timeout } from 'mocha-typescript';
import * as assert from 'assert';
import { env, bx, undeploy, deploy, plugins } from 'openwhisk-deploy';
import { getLogger } from 'log4js';
import * as path from 'path';

const ORG = 'villard@us.ibm.com';
const SPACE = 'wskp-ibmcloud-dev';

@suite('IBM cloud services - Integration')
class integration {

    config;

    async before() {
        this.config = { logger: getLogger(), cache: '.' };
        this.config.logger.level = process.env.LOGGER_LEVEL || 'off';

        await plugins.registerFromPath(this.config, path.join(__dirname, '../..'));
    }

    @test.skip
    async cloudant() {
        const cred = { org: ORG, home: './.openwhisk' };
        try {
            // Create cloudant service outside of wskd (unmanaged)
            await bx.login(this.config, cred);
            await bx.run(this.config, cred, 'plugin install Cloud-Functions -r Bluemix -f');
            await bx.run(this.config, cred, `iam space-create ${SPACE}`);
            await bx.run(this.config, cred, `target -s ${SPACE}`);
            await bx.run(this.config, cred, `wsk property get`);

            await bx.run(this.config, cred, `service create cloudantNoSQLDB Lite wskp-cloudant`);
            await bx.run(this.config, cred, `service key-create wskp-cloudant wskp-cloudant-key`);

            this.config.ow = env.initWsk();
            await undeploy.all(this.config.ow);

            // Setup done. Run test...

            await deploy.apply({
                ow: this.config.ow,
                location: 'test/cloudant.yaml'
            });

            const cloudant = await this.config.ow.packages.get({ name: 'wskp-cloudant-binding' });
            assert.ok(cloudant);
            assert.deepStrictEqual(cloudant.binding, { namespace: 'whisk.system', name: 'cloudant' });

            const dbs = await this.config.ow.actions.invoke({ name: 'wskp-cloudant-binding/list-all-databases', blocking: true });
            assert.deepStrictEqual(dbs.response.result.all_databases, []);
        } catch (e) {
            console.log(e);
            assert.ok(false);
        } finally {
            await bx.run(this.config, cred, `iam space-delete ${SPACE} -f`);
        }
    }
}