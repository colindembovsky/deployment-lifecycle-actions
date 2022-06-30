"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("./test-utils");
const ava_1 = __importDefault(require("ava"));
const deactivate_deployments_1 = require("./deactivate-deployments");
(0, test_utils_1.setupTests)(ava_1.default);
(0, ava_1.default)("fails for non PR events", async (t) => {
    const ctx = (0, test_utils_1.stubContext)();
    const gh = (0, test_utils_1.stubGH)();
    await t.throwsAsync(async () => await new deactivate_deployments_1.Runner(gh, ctx).run(), {
        instanceOf: Error,
        message: "This action must be run from a PR event"
    });
});
(0, ava_1.default)("ignores deployments in failure state", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            head: {
                ref: "/heads/refs/123"
            }
        }
    });
    (0, test_utils_1.stubListDeployments)(gh, [
        { id: 123, environment: "dev" }
    ]);
    (0, test_utils_1.stubListDeploymentStatuses)(gh, ["failure"]);
    const createDepStatusSpy = (0, test_utils_1.stubCreateDeploymentStatus)(gh);
    await new deactivate_deployments_1.Runner(gh, ctx).run();
    t.true(createDepStatusSpy.notCalled);
});
(0, ava_1.default)("ignores deployments in inactive state", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            head: {
                ref: "/heads/refs/123"
            }
        }
    });
    (0, test_utils_1.stubListDeployments)(gh, [
        { id: 123, environment: "dev" }
    ]);
    (0, test_utils_1.stubListDeploymentStatuses)(gh, ["inactive"]);
    const createDepStatusSpy = (0, test_utils_1.stubCreateDeploymentStatus)(gh);
    await new deactivate_deployments_1.Runner(gh, ctx).run();
    t.true(createDepStatusSpy.notCalled);
});
(0, ava_1.default)("deactivates deployment correctly", async (t) => {
    var _a, _b, _c, _d;
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            head: {
                ref: "/heads/refs/123"
            }
        }
    });
    (0, test_utils_1.stubListDeployments)(gh, [
        { id: 123, environment: "dev" }
    ]);
    (0, test_utils_1.stubListDeploymentStatuses)(gh, ["success"]);
    const createDepStatusSpy = (0, test_utils_1.stubCreateDeploymentStatus)(gh);
    await new deactivate_deployments_1.Runner(gh, ctx).run();
    t.true(createDepStatusSpy.calledTwice);
    t.is((_a = createDepStatusSpy.getCall(0).args[0]) === null || _a === void 0 ? void 0 : _a.state, "failure");
    t.is((_b = createDepStatusSpy.getCall(0).args[0]) === null || _b === void 0 ? void 0 : _b.deployment_id, 123);
    t.is((_c = createDepStatusSpy.getCall(1).args[0]) === null || _c === void 0 ? void 0 : _c.state, "inactive");
    t.is((_d = createDepStatusSpy.getCall(1).args[0]) === null || _d === void 0 ? void 0 : _d.deployment_id, 123);
});
//# sourceMappingURL=deactivate-deployments.test.js.map