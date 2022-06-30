"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("./test-utils");
const ava_1 = __importDefault(require("ava"));
const create_deployment_from_label_1 = require("./create-deployment-from-label");
(0, test_utils_1.setupTests)(ava_1.default);
(0, ava_1.default)("validate throws with no PR", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    await t.throwsAsync(async () => await new create_deployment_from_label_1.Runner(gh).run(), {
        instanceOf: Error,
        message: "This action must be run from a PR 'labeled' event"
    });
});
(0, ava_1.default)("validate throws with no label", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    await t.throwsAsync(async () => await new create_deployment_from_label_1.Runner(gh).run(), {
        instanceOf: Error,
        message: "This action must be run from a PR 'labeled' event"
    });
});
(0, ava_1.default)("validate works correctly with proper label and PR", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    (0, test_utils_1.stubContext)();
    const createIssueSpy = (0, test_utils_1.stubCreateIssue)(gh, false);
    await new create_deployment_from_label_1.Runner(gh).run();
    t.assert(createIssueSpy.calledOnce);
});
//# sourceMappingURL=create-deployment-from-label.test.js.map