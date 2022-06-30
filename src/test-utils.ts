import { TestFn } from "ava";
import * as sinon from "sinon";
import * as github from '@actions/github';
import * as core from '@actions/core';
import {GitHub} from '@actions/github/lib/utils';

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

export function stubCreateIssue(gh: InstanceType<typeof GitHub>, fail: boolean) {
    const spy = sinon.stub(gh.rest.issues, "createComment");
    
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
    isBool: boolean
}

export function stubCoreParams(values: IParam[]) {
    const spy = sinon.stub(core, "getInput");
    values.forEach(v => {
        if (v.isBool) {
            spy.withArgs(v.name).resolves(v.value.toLocaleLowerCase() === "true");
        } else {
            spy.withArgs(v.name).resolves(v.value);
        }
    });
}

export function stubContext() {
    sinon.stub(github.context, "payload").value({ pull_request: "foo", label: "deploy to foo" });
}