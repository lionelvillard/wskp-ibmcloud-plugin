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
import { getLogger } from 'log4js';

@suite
class Unit {

    config;

    async before() {
        this.config = { cache: '.openwhisk', logger: getLogger() };
        this.config.logger_level = process.env.LOGGER_LEVEL || 'off';
    }

    @test.skip
    async cloudant() {
        try {
            const result = await cloudant.serviceContributor(this.config, 'mycloudant', {
                service: 'ibm-cloudant',
                org: 'villard@us.ibm.com',
                name: 'mycloudant',
                key: 'cloudantkey',
                space: 'dev'
            });
            assert.ok(result)
            assert.strictEqual(result[0].name, 'mycloudant');
        } catch (e) {
            console.log(e)
        }

    }

}