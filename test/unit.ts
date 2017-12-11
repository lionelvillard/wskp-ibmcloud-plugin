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

import * as cloudant from '../ibm';
import { suite, test, slow, timeout } from 'mocha-typescript';
import * as assert from 'assert';
import * as wskd from 'openwhisk-deploy';

@suite('IBM cloud services - Unit')
class Unit {

    config;

    async before() {
        this.config = wskd.init.newConfig(null, process.env.LOGGER_LEVEL || 'off');
        await wskd.init.init(this.config);
    }

    @test('Cloudant service')
    async cloudantService() {
        const result = cloudant.resourceContributor(this.config, 'mycloudant', {
            type: 'cloudant',
            org: process.env.BLUEMIX_ORG,
            space: 'dev'
        });
        assert.ok(result);
        await wskd.allTasks();
        assert.ok((result[0].body.space_guid as wskd.Task<string>).resolved);
    }

    @test('Cloudant service binding - inlined')
    async cloudantBinding() {
        const result = cloudant.resourceBindingContributor(this.config, 'mycloudant', {
            service: {
                type: 'cloudant',
                name: 'cloudant',
                org: process.env.BLUEMIX_ORG,
                space: 'dev'
            },
            dbname: 'cloudantdb',
            key: 'cloudantkey'
        });
        assert.ok(result);
        await wskd.allTasks();

        assert.equal(result[0].body.bind, '/whisk.system/cloudant');

        const task = result[0].body.inputs;
        assert.ok(task.resolved.host);
        assert.ok(task.resolved.password);
        assert.ok(task.resolved.port);
        assert.ok(task.resolved.url);
        assert.ok(task.resolved.username);
    }

}