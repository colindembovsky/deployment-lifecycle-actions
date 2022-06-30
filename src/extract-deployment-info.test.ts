import { 
    setupTests, 
    stubContext,
    stubCoreOutput
} from "./test-utils";
import test from "ava";
import { Runner } from "./extract-deployment-info";

setupTests(test);

test("fails for non deployment_status events", async(t) => {
    const ctx = stubContext();

    t.throws(
        () => new Runner(ctx).run(),
        {
            instanceOf: Error,
            message: "This Action only works for 'deployment_status' triggers"
        }
    );
});

test("succeeds for non deployment_status event", async(t) => {
    const ctx = stubContext(
        {
            deployment: 
            {
                environment: "dev",
                ref: "123"
            }
        },
        "colin",
        "deployment_status"
    );
    const setOutputSpy = stubCoreOutput();

    new Runner(ctx).run();
    t.true(setOutputSpy.calledTwice);
    t.deepEqual(setOutputSpy.getCall(0).args, [ 'deployment_ref', '123' ]);
    t.deepEqual(setOutputSpy.getCall(1).args, [ 'environment', 'dev' ]);
});