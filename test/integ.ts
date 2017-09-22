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
import { auth, bx, undeploy, deploy, plugins } from 'openwhisk-deploy';
import { getLogger } from 'log4js';
import * as path from 'path';

const ORG = 'villard@us.ibm.com';
const SPACE = 'wskp-ibmcloud-dev';


@suite
class integration {

    ctx;

    async before() {
        this.ctx = { logger: getLogger(), ow: auth.initWsk() };
        this.ctx.logger.level = process.env.LOGGER_LEVEL || 'off';

        await plugins.registerFromPath(this.ctx, path.join(__dirname, '../..'));
        await undeploy.all(this.ctx.ow);
    }

    after() {
    }

    @test
    async cloudant_unmanaged() {
        const cred = { org: ORG, home: './.openwhisk' };
        try {
            await bx.login(this.ctx, cred);
            await bx.run(this.ctx, cred, 'plugin install Cloud-Functions -r Bluemix -f');
            await bx.run(this.ctx, cred, `iam space-create ${SPACE}`);
            await bx.run(this.ctx, cred, `target -s ${SPACE}`);
            await bx.run(this.ctx, cred, `wsk property get`);
            await bx.run(this.ctx, cred, `service create cloudantNoSQLDB Lite wskp-cloudant`);
            await bx.run(this.ctx, cred, `service key-create wskp-cloudant wskp-cloudant-key`);

            await deploy({
                ow: this.ctx.ow,
                location: 'test/cloudant.yaml'
            });

            const cloudant = await this.ctx.ow.packages.get({ name: 'wskp-cloudant-binding' });
            assert.ok(cloudant);
            assert.deepStrictEqual(cloudant.binding, { namespace: 'whisk.system', name: 'cloudant' });

            const dbs = await this.ctx.ow.actions.invoke({ name: 'wskp-cloudant-binding/list-all-databases', blocking: true });
            assert.deepStrictEqual(dbs.response.result.all_databases, []);
        } catch (e) {
            console.log(e);
            assert.ok(false);
        } finally {
            await bx.run(this.ctx, cred, `iam space-delete ${SPACE} -f`);
        }
    }
}