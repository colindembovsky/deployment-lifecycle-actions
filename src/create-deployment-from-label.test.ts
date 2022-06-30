import { 
    setupTests, 
    stubGH, 
    stubContext,
    setCoreParams,
    stubCreateIssue,
    stubCreateWorkflowDispatch,
    stubRemoveLabel
} from "./test-utils";
import test from "ava";
import { Runner } from "./create-deployment-from-label";

setupTests(test);

test("validate throws with no PR", async(t) => {
    const gh = stubGH();
    const ctx = stubContext();

    await t.throwsAsync(
        async () => await new Runner(gh, ctx).run(),
        {
            instanceOf: Error,
            message: "This action must be run from a PR 'labeled' event"
        }
    );
});

test("validate throws with no label", async(t) => {
    const gh = stubGH();
    const ctx = stubContext({ 
        pull_request: {
            number: 123
        }
    });

    await t.throwsAsync(
        async () => await new Runner(gh, ctx).run(),
        {
            instanceOf: Error,
            message: "This action must be run from a PR 'labeled' event"
        }
    );
});

test("fails if environment-regex is not supplied", async(t) => {
    const gh = stubGH();
    const ctx = stubContext({ 
        pull_request: {
            number: 123
        }, 
        label: {
            name: "deploy to dev"
        }
    });
    await t.throwsAsync(
        async () => await new Runner(gh, ctx).run(),
        {
            instanceOf: Error,
            message: "Input required and not supplied: environment-regex"
        }
    );
});

test("fails if cannot extract environment", async(t) => {
    const gh = stubGH();
    const ctx = stubContext({ 
        pull_request: {
            number: 123
        }, 
        label: {
            name: "send to dev"
        }
    });
    setCoreParams();

    await t.throwsAsync(
        async () => await new Runner(gh, ctx).run(),
        {
            instanceOf: Error,
            message: "Cannot extract environment from label (no regex match)"
        }
    );
});

test("fails if deployment-workflow-name is not supplied", async(t) => {
    const gh = stubGH();
    const ctx = stubContext({ 
        pull_request: {
            number: 123
        }, 
        label: {
            name: "deploy to dev"
        }
    });
    setCoreParams([
        { name: "create-comment", value: "false" }
    ]);

    await t.throwsAsync(
        async () => await new Runner(gh, ctx).run(),
        {
            instanceOf: Error,
            message: "Input required and not supplied: deployment-workflow-name"
        }
    );
});

test("does not create comment when create-comment is false", async(t) => {
    const gh = stubGH();
    const ctx = stubContext({ 
        pull_request: {
            number: 123
        }, 
        label: {
            name: "deploy to dev"
        }
    });
    setCoreParams([
        { name: "create-comment", value: "false" },
        { name: "deployment-workflow-name", value: "deploy.yml" }
    ]);
    stubCreateWorkflowDispatch(gh);
    stubRemoveLabel(gh);
    const createIssueSpy = stubCreateIssue(gh);

    await new Runner(gh, ctx).run();
    t.true(createIssueSpy.notCalled);
});

test("creates comment when create-comment is true", async(t) => {
    const gh = stubGH();
    const ctx = stubContext({ 
        actor: "colindembovsky",
        pull_request: {
            number: 123
        }, 
        label: {
            name: "deploy to dev"
        }
    });
    setCoreParams([
        { name: "deployment-workflow-name", value: "deploy.yml" }
    ]);
    stubCreateWorkflowDispatch(gh);
    stubRemoveLabel(gh);
    const createIssueSpy = stubCreateIssue(gh);

    await new Runner(gh, ctx).run();
    t.true(createIssueSpy.calledOnce);
    t.is(createIssueSpy.getCall(0).args[0]?.issue_number, 123);
});

test("makes correct workflowDispatch call with no additional inputs", async(t) => {
    const gh = stubGH();
    const ctx = stubContext({ 
        pull_request: {
            number: 123
        }, 
        label: {
            name: "deploy to dev"
        }
    });
    setCoreParams([
        { name: "create-comment", value: "false" },
        { name: "deployment-workflow-name", value: "deploy.yml" }
    ]);
    stubCreateIssue(gh);
    stubRemoveLabel(gh);
    const createWorkflowDispatchSpy = stubCreateWorkflowDispatch(gh);

    await new Runner(gh, ctx).run();
    t.true(createWorkflowDispatchSpy.calledOnce);
    t.is(createWorkflowDispatchSpy.getCall(0).args[0]?.workflow_id, "deploy.yml");
    t.is(createWorkflowDispatchSpy.getCall(0).args[0]?.ref, "123");
    t.deepEqual(createWorkflowDispatchSpy.getCall(0).args[0]?.inputs, {environment: "dev"});
});

test("fails when additional inputs is invalid JSON", async(t) => {
    const gh = stubGH();
    const ctx = stubContext({ 
        pull_request: {
            number: 123
        }, 
        label: {
            name: "deploy to dev"
        }
    });
    setCoreParams([
        { name: "create-comment", value: "false" },
        { name: "deployment-workflow-name", value: "deploy.yml" },
        { name: "additional-inputs-json", value: 'foo=bar' }
    ]);
    stubCreateIssue(gh);
    stubRemoveLabel(gh);
    stubCreateWorkflowDispatch(gh);

    await t.throwsAsync(
        async () => await new Runner(gh, ctx).run(),
        {
            instanceOf: Error,
            message: "Could not parse additional inputs (invalid JSON)"
        }
    );
});

test("makes correct workflowDispatch call with additional inputs", async(t) => {
    const gh = stubGH();
    const ctx = stubContext({ 
        pull_request: {
            number: 123
        }, 
        label: {
            name: "deploy to dev"
        }
    });
    setCoreParams([
        { name: "create-comment", value: "false" },
        { name: "deployment-workflow-name", value: "deploy.yml" },
        { name: "additional-inputs-json", value: '{"foo":"bar"}' }
    ]);
    stubCreateIssue(gh);
    stubRemoveLabel(gh);
    const createWorkflowDispatchSpy = stubCreateWorkflowDispatch(gh);

    await new Runner(gh, ctx).run();
    t.true(createWorkflowDispatchSpy.calledOnce);
    t.is(createWorkflowDispatchSpy.getCall(0).args[0]?.workflow_id, "deploy.yml");
    t.is(createWorkflowDispatchSpy.getCall(0).args[0]?.ref, "123");
    t.deepEqual(createWorkflowDispatchSpy.getCall(0).args[0]?.inputs, {environment: "dev", foo: "bar"});
});