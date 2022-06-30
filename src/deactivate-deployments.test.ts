import { 
    setupTests, 
    stubContext,
    stubCreateDeploymentStatus,
    stubGH,
    stubListDeployments,
    stubListDeploymentStatuses
} from "./test-utils";
import test from "ava";
import { Runner } from "./deactivate-deployments";

setupTests(test);

test("fails for non PR events", async(t) => {
    const ctx = stubContext();
    const gh = stubGH();

    await t.throwsAsync(
        async () => await new Runner(gh, ctx).run(),
        {
            instanceOf: Error,
            message: "This action must be run from a PR event"
        }
    );
});

test("ignores deployments in failure state", async(t) => {
    const gh = stubGH();
    const ctx = stubContext(
        {
            pull_request: 
            {
                head: {
                    ref: "/heads/refs/123"
                }
            }
        }
    );
    stubListDeployments(gh, [
        { id: 123, environment: "dev" }
    ]);
    stubListDeploymentStatuses(gh, [ "failure" ]);
    const createDepStatusSpy = stubCreateDeploymentStatus(gh);

    await new Runner(gh, ctx).run();

    t.true(createDepStatusSpy.notCalled);
});

test("ignores deployments in inactive state", async(t) => {
    const gh = stubGH();
    const ctx = stubContext(
        {
            pull_request: 
            {
                head: {
                    ref: "/heads/refs/123"
                }
            }
        }
    );
    stubListDeployments(gh, [
        { id: 123, environment: "dev" }
    ]);
    stubListDeploymentStatuses(gh, [ "inactive" ]);
    const createDepStatusSpy = stubCreateDeploymentStatus(gh);

    await new Runner(gh, ctx).run();

    t.true(createDepStatusSpy.notCalled);
});

test("deactivates deployment correctly", async(t) => {
    const gh = stubGH();
    const ctx = stubContext(
        {
            pull_request: 
            {
                head: {
                    ref: "/heads/refs/123"
                }
            }
        }
    );
    stubListDeployments(gh, [
        { id: 123, environment: "dev" }
    ]);
    stubListDeploymentStatuses(gh, [ "success" ]);
    const createDepStatusSpy = stubCreateDeploymentStatus(gh);

    await new Runner(gh, ctx).run();

    t.true(createDepStatusSpy.calledTwice);
    t.is(createDepStatusSpy.getCall(0).args[0]?.state, "failure");
    t.is(createDepStatusSpy.getCall(0).args[0]?.deployment_id, 123);
    t.is(createDepStatusSpy.getCall(1).args[0]?.state, "inactive");
    t.is(createDepStatusSpy.getCall(1).args[0]?.deployment_id, 123);
});