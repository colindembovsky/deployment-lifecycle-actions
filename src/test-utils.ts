import { TestFn } from "ava";
import * as sinon from "sinon";
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { Context } from '@actions/github/lib/context';
import * as core from '@actions/core';
import { IDeployment } from "./deactivate-deployments";

type TestContext = {
    stdoutWrite: any;
    stderrWrite: any;
    testOutput: string;
    env: NodeJS.ProcessEnv;
};

function wrapOutput(context: TestContext) {
    // Function signature taken from Socket.write.
    // Note there are two overloads:
    // write(buffer: Uint8Array | string, cb?: (err?: Error) => void): boolean;
    // write(str: Uint8Array | string, encoding?: string, cb?: (err?: Error) => void): boolean;
    return (
        chunk: Uint8Array | string,
        encoding?: string,
        cb?: (err?: Error) => void
    ): boolean => {
        // Work out which method overload we are in
        if (cb === undefined && typeof encoding === "function") {
        cb = encoding;
            encoding = undefined;
        }

        // Record the output
        if (typeof chunk === "string") {
            context.testOutput += chunk;
        } else {
            context.testOutput += new TextDecoder(encoding || "utf-8").decode(chunk);
        }

        // Satisfy contract by calling callback when done
        if (cb !== undefined && typeof cb === "function") {
            cb();
        }

        return true;
    };
}

export function setupTests(test: TestFn<any>) {
    const typedTest = test as TestFn<TestContext>;

    typedTest.beforeEach((t) => {
        // Replace stdout and stderr so we can record output during tests
        t.context.testOutput = "";
        const processStdoutWrite = process.stdout.write.bind(process.stdout);
        t.context.stdoutWrite = processStdoutWrite;
        process.stdout.write = wrapOutput(t.context) as any;
        const processStderrWrite = process.stderr.write.bind(process.stderr);
        t.context.stderrWrite = processStderrWrite;
        process.stderr.write = wrapOutput(t.context) as any;

        // Many tests modify environment variables. Take a copy now so that
        // we reset them after the test to keep tests independent of each other.
        // process.env only has strings fields, so a shallow copy is fine.
        t.context.env = {};
        Object.assign(t.context.env, process.env);
    });
  
    typedTest.afterEach.always((t) => {
        // Restore stdout and stderr
        // The captured output is only replayed if the test failed
        process.stdout.write = t.context.stdoutWrite;
        process.stderr.write = t.context.stderrWrite;
        if (!t.passed) {
            process.stdout.write(t.context.testOutput);
        }

        // Undo any modifications made by sinon
        sinon.restore();

        // Undo any modifications to the env
        process.env = t.context.env;
    });
}

export function stubGH() {
    return github.getOctokit("token");
}

export function stubCreateIssue(gh: InstanceType<typeof GitHub>, fail: boolean = false) {
    const spy = sinon.stub(gh.rest.issues, "createComment");
    
    if (fail) {
        spy.throws(new Error("some error message"));
    } else {
        spy.resolves();
    }

    return spy;
}

export function stubCreateWorkflowDispatch(gh: InstanceType<typeof GitHub>, fail: boolean = false) {
    const spy = sinon.stub(gh.rest.actions, "createWorkflowDispatch");
    
    if (fail) {
        spy.throws(new Error("some error message"));
    } else {
        spy.resolves();
    }

    return spy;
}

export function stubRemoveLabel(gh: InstanceType<typeof GitHub>, fail: boolean = false) {
    const spy = sinon.stub(gh.rest.issues, "removeLabel");
    
    if (fail) {
        spy.throws(new Error("some error message"));
    } else {
        spy.resolves();
    }

    return spy;
}

interface IParam {
    name: string,
    value: string
}

export function setCoreParams(params: IParam[] = []) {
    process.env["INPUT_ENVIRONMENT-REGEX"] = "deploy to (\\w+)";
    process.env["INPUT_CREATE-COMMENT"] = "true";
    
    params.forEach(p => process.env[`INPUT_${p.name.toLocaleUpperCase()}`] = p.value);
}

export function stubCoreOutput() {
    return sinon.spy(core, "setOutput");
}

export function stubContext(payload: any = null, actor: string = "colin", eventName: string = "pull_request") {
    const ctx = new Context();
    if (payload) {
        sinon.stub(ctx, "payload").value(payload);
    }
    sinon.stub(ctx, "actor").value(actor);
    sinon.stub(ctx, "eventName").value(eventName);
    return ctx;
}

export function stubListDeployments(gh: InstanceType<typeof GitHub>, deployments: IDeployment[]) {
    const spy = sinon.stub(gh.rest.repos, "listDeployments");
    spy.resolves({
        data: deployments
    } as any);

    return spy;
}

export function stubListDeploymentStatuses(gh: InstanceType<typeof GitHub>, states: string[]) {
    const spy = sinon.stub(gh.rest.repos, "listDeploymentStatuses");

    const data: any = [];
    states.forEach(s => data.push({ state: s }));
    spy.resolves({
        data: data
    } as any);

    return spy;
}

export function stubCreateDeploymentStatus(gh: InstanceType<typeof GitHub>, fail: boolean = false) {
    const spy = sinon.stub(gh.rest.repos, "createDeploymentStatus");
    
    if (fail) {
        spy.throws(new Error("some error message"));
    } else {
        spy.resolves();
    }

    return spy;
}