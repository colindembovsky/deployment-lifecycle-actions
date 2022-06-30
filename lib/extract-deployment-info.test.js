"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("./test-utils");
const ava_1 = __importDefault(require("ava"));
const extract_deployment_info_1 = require("./extract-deployment-info");
(0, test_utils_1.setupTests)(ava_1.default);
(0, ava_1.default)("fails for non deployment_status events", async (t) => {
    const ctx = (0, test_utils_1.stubContext)();
    t.throws(() => new extract_deployment_info_1.Runner(ctx).run(), {
        instanceOf: Error,
        message: "This Action only works for 'deployment_status' triggers"
    });
});
(0, ava_1.default)("succeeds for non deployment_status event", async (t) => {
    const ctx = (0, test_utils_1.stubContext)({
        deployment: {
            environment: "dev",
            ref: "123"
        }
    }, "colin", "deployment_status");
    const setOutputSpy = (0, test_utils_1.stubCoreOutput)();
    new extract_deployment_info_1.Runner(ctx).run();
    t.true(setOutputSpy.calledTwice);
    t.deepEqual(setOutputSpy.getCall(0).args, ['deployment_github_ref', '123']);
    t.deepEqual(setOutputSpy.getCall(1).args, ['environment', 'dev']);
});
//# sourceMappingURL=extract-deployment-info.test.js.map