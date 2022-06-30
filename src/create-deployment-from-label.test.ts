import { setupTests, stubCreateIssue, stubGH, stubContext } from "./test-utils";
import test from "ava";
import { Runner } from "./create-deployment-from-label";

setupTests(test);

test("validate throws with no PR", async(t) => {
    const gh = stubGH();

    await t.throwsAsync(
        async () => await new Runner(gh).run(),
        {
            instanceOf: Error,
            message: "This action must be run from a PR 'labeled' event"
        }
    );
});

test("validate throws with no label", async(t) => {
    const gh = stubGH();

    await t.throwsAsync(
        async () => await new Runner(gh).run(),
        {
            instanceOf: Error,
            message: "This action must be run from a PR 'labeled' event"
        }
    );
});

test("validate works correctly with proper label and PR", async(t) => {
    const gh = stubGH();
    stubContext();
    const createIssueSpy = stubCreateIssue(gh, false);

    await new Runner(gh).run();
    t.assert(createIssueSpy.calledOnce);
});