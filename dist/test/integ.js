"use strict";
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
const mocha_typescript_1 = require("mocha-typescript");
const assert = require("assert");
const openwhisk_deploy_1 = require("openwhisk-deploy");
const log4js_1 = require("log4js");
const path = require("path");
const ORG = 'villard@us.ibm.com';
const SPACE = 'wskp-ibmcloud-dev';
let integration = class integration {
    before() {
        return __awaiter(this, void 0, void 0, function* () {
            this.ctx = { logger: log4js_1.getLogger(), ow: openwhisk_deploy_1.auth.initWsk() };
            this.ctx.logger.level = process.env.LOGGER_LEVEL || 'off';
            yield openwhisk_deploy_1.plugins.registerFromPath(this.ctx, path.join(__dirname, '../..'));
            yield openwhisk_deploy_1.undeploy.all(this.ctx.ow);
        });
    }
    after() {
    }
    cloudant_unmanaged() {
        return __awaiter(this, void 0, void 0, function* () {
            const cred = { org: ORG, home: './.openwhisk' };
            try {
                yield openwhisk_deploy_1.bx.login(this.ctx, cred);
                yield openwhisk_deploy_1.bx.run(this.ctx, cred, 'plugin install Cloud-Functions -r Bluemix -f');
                yield openwhisk_deploy_1.bx.run(this.ctx, cred, `iam space-create ${SPACE}`);
                yield openwhisk_deploy_1.bx.run(this.ctx, cred, `target -s ${SPACE}`);
                yield openwhisk_deploy_1.bx.run(this.ctx, cred, `wsk property get`);
                yield openwhisk_deploy_1.bx.run(this.ctx, cred, `service create cloudantNoSQLDB Lite wskp-cloudant`);
                yield openwhisk_deploy_1.bx.run(this.ctx, cred, `service key-create wskp-cloudant wskp-cloudant-key`);
                yield openwhisk_deploy_1.deploy({
                    ow: this.ctx.ow,
                    location: 'test/cloudant.yaml'
                });
                const cloudant = yield this.ctx.ow.packages.get({ name: 'wskp-cloudant-binding' });
                assert.ok(cloudant);
                assert.deepStrictEqual(cloudant.binding, { namespace: 'whisk.system', name: 'cloudant' });
                const dbs = yield this.ctx.ow.actions.invoke({ name: 'wskp-cloudant-binding/list-all-databases', blocking: true });
                assert.deepStrictEqual(dbs.response.result.all_databases, []);
            }
            catch (e) {
                console.log(e);
                assert.ok(false);
            }
            finally {
                yield openwhisk_deploy_1.bx.run(this.ctx, cred, `iam space-delete ${SPACE} -f`);
            }
        });
    }
};
__decorate([
    mocha_typescript_1.test
], integration.prototype, "cloudant_unmanaged", null);
integration = __decorate([
    mocha_typescript_1.suite
], integration);
//# sourceMappingURL=integ.js.map