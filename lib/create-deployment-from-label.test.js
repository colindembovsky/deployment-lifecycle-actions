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
    const ctx = (0, test_utils_1.stubContext)();
    await t.throwsAsync(async () => await new create_deployment_from_label_1.Runner(gh, ctx).run(), {
        instanceOf: Error,
        message: "This action must be run from a PR 'labeled' event"
    });
});
(0, ava_1.default)("validate throws with no label", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            number: 123
        }
    });
    await t.throwsAsync(async () => await new create_deployment_from_label_1.Runner(gh, ctx).run(), {
        instanceOf: Error,
        message: "This action must be run from a PR 'labeled' event"
    });
});
(0, ava_1.default)("fails if environment-regex is not supplied", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            number: 123
        },
        label: {
            name: "deploy to dev"
        }
    });
    await t.throwsAsync(async () => await new create_deployment_from_label_1.Runner(gh, ctx).run(), {
        instanceOf: Error,
        message: "Input required and not supplied: environment-regex"
    });
});
(0, ava_1.default)("fails if cannot extract environment", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            number: 123
        },
        label: {
            name: "send to dev"
        }
    });
    (0, test_utils_1.setCoreParams)();
    await t.throwsAsync(async () => await new create_deployment_from_label_1.Runner(gh, ctx).run(), {
        instanceOf: Error,
        message: "Cannot extract environment from label (no regex match)"
    });
});
(0, ava_1.default)("fails if deployment-workflow-name is not supplied", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            number: 123
        },
        label: {
            name: "deploy to dev"
        }
    });
    (0, test_utils_1.setCoreParams)([
        { name: "create-comment", value: "false" }
    ]);
    await t.throwsAsync(async () => await new create_deployment_from_label_1.Runner(gh, ctx).run(), {
        instanceOf: Error,
        message: "Input required and not supplied: deployment-workflow-name"
    });
});
(0, ava_1.default)("does not create comment when create-comment is false", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            number: 123,
            head: {
                ref: "/refs/heads/pull/123"
            }
        },
        label: {
            name: "deploy to dev"
        }
    });
    (0, test_utils_1.setCoreParams)([
        { name: "create-comment", value: "false" },
        { name: "deployment-workflow-name", value: "deploy.yml" }
    ]);
    (0, test_utils_1.stubCreateWorkflowDispatch)(gh);
    (0, test_utils_1.stubRemoveLabel)(gh);
    const createIssueSpy = (0, test_utils_1.stubCreateIssue)(gh);
    await new create_deployment_from_label_1.Runner(gh, ctx).run();
    t.true(createIssueSpy.notCalled);
});
(0, ava_1.default)("creates comment when create-comment is true", async (t) => {
    var _a;
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        actor: "colindembovsky",
        pull_request: {
            number: 123,
            head: {
                ref: "/refs/heads/pull/123"
            }
        },
        label: {
            name: "deploy to dev"
        }
    });
    (0, test_utils_1.setCoreParams)([
        { name: "deployment-workflow-name", value: "deploy.yml" }
    ]);
    (0, test_utils_1.stubCreateWorkflowDispatch)(gh);
    (0, test_utils_1.stubRemoveLabel)(gh);
    const createIssueSpy = (0, test_utils_1.stubCreateIssue)(gh);
    await new create_deployment_from_label_1.Runner(gh, ctx).run();
    t.true(createIssueSpy.calledOnce);
    t.is((_a = createIssueSpy.getCall(0).args[0]) === null || _a === void 0 ? void 0 : _a.issue_number, 123);
});
(0, ava_1.default)("makes correct workflowDispatch call with no additional inputs", async (t) => {
    var _a, _b, _c;
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            number: 123,
            head: {
                ref: "/refs/heads/pull/123"
            }
        },
        label: {
            name: "deploy to dev"
        }
    });
    (0, test_utils_1.setCoreParams)([
        { name: "create-comment", value: "false" },
        { name: "deployment-workflow-name", value: "deploy.yml" }
    ]);
    (0, test_utils_1.stubCreateIssue)(gh);
    (0, test_utils_1.stubRemoveLabel)(gh);
    const createWorkflowDispatchSpy = (0, test_utils_1.stubCreateWorkflowDispatch)(gh);
    await new create_deployment_from_label_1.Runner(gh, ctx).run();
    t.true(createWorkflowDispatchSpy.calledOnce);
    t.is((_a = createWorkflowDispatchSpy.getCall(0).args[0]) === null || _a === void 0 ? void 0 : _a.workflow_id, "deploy.yml");
    t.is((_b = createWorkflowDispatchSpy.getCall(0).args[0]) === null || _b === void 0 ? void 0 : _b.ref, "/refs/heads/pull/123");
    t.deepEqual((_c = createWorkflowDispatchSpy.getCall(0).args[0]) === null || _c === void 0 ? void 0 : _c.inputs, { environment: "dev" });
});
(0, ava_1.default)("fails when additional inputs is invalid JSON", async (t) => {
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            number: 123
        },
        label: {
            name: "deploy to dev"
        }
    });
    (0, test_utils_1.setCoreParams)([
        { name: "create-comment", value: "false" },
        { name: "deployment-workflow-name", value: "deploy.yml" },
        { name: "additional-inputs-json", value: 'foo=bar' }
    ]);
    (0, test_utils_1.stubCreateIssue)(gh);
    (0, test_utils_1.stubRemoveLabel)(gh);
    (0, test_utils_1.stubCreateWorkflowDispatch)(gh);
    await t.throwsAsync(async () => await new create_deployment_from_label_1.Runner(gh, ctx).run(), {
        instanceOf: Error,
        message: "Could not parse additional inputs (invalid JSON)"
    });
});
(0, ava_1.default)("makes correct workflowDispatch call with additional inputs", async (t) => {
    var _a, _b, _c;
    const gh = (0, test_utils_1.stubGH)();
    const ctx = (0, test_utils_1.stubContext)({
        pull_request: {
            number: 123,
            head: {
                ref: "/refs/heads/pull/123"
            }
        },
        label: {
            name: "deploy to dev"
        }
    });
    (0, test_utils_1.setCoreParams)([
        { name: "create-comment", value: "false" },
        { name: "deployment-workflow-name", value: "deploy.yml" },
        { name: "additional-inputs-json", value: '{"foo":"bar"}' }
    ]);
    (0, test_utils_1.stubCreateIssue)(gh);
    (0, test_utils_1.stubRemoveLabel)(gh);
    const createWorkflowDispatchSpy = (0, test_utils_1.stubCreateWorkflowDispatch)(gh);
    await new create_deployment_from_label_1.Runner(gh, ctx).run();
    t.true(createWorkflowDispatchSpy.calledOnce);
    t.is((_a = createWorkflowDispatchSpy.getCall(0).args[0]) === null || _a === void 0 ? void 0 : _a.workflow_id, "deploy.yml");
    t.is((_b = createWorkflowDispatchSpy.getCall(0).args[0]) === null || _b === void 0 ? void 0 : _b.ref, "/refs/heads/pull/123");
    t.deepEqual((_c = createWorkflowDispatchSpy.getCall(0).args[0]) === null || _c === void 0 ? void 0 : _c.inputs, { environment: "dev", foo: "bar" });
});
//# sourceMappingURL=create-deployment-from-label.test.js.map