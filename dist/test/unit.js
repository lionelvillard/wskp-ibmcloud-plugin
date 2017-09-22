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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cloudant = require("../ibm");
const mocha_typescript_1 = require("mocha-typescript");
const assert = require("assert");
const log4js_1 = require("log4js");
let Unit = class Unit {
    before() {
        return __awaiter(this, void 0, void 0, function* () {
            this.config = { cache: '.openwhisk', logger: log4js_1.getLogger() };
            this.config.logger_level = process.env.LOGGER_LEVEL || 'off';
        });
    }
    cloudant() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield cloudant.serviceContributor(this.config, 'mycloudant', {
                    org: 'villard@us.ibm.com',
                    name: 'mycloudant',
                    key: 'cloudantkey',
                    space: 'dev'
                });
                assert.ok(result);
                assert.strictEqual(result[0].name, 'mycloudant');
            }
            catch (e) {
                console.log(e);
            }
        });
    }
};
__decorate([
    mocha_typescript_1.test
], Unit.prototype, "cloudant", null);
Unit = __decorate([
    mocha_typescript_1.suite
], Unit);
//# sourceMappingURL=unit.js.map