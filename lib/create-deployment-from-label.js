"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPromise = exports.run = void 0;
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
class Runner {
    constructor(token) {
        this.github = (0, github_1.getOctokit)(token);
    }
    validate() {
        if (!github_1.context.payload.pull_request || !github_1.context.payload.label) {
            throw new Error("This action must be run from a PR 'labeled' event");
        }
    }
    parseLabel() {
        core.startGroup("Create comment");
        const label = `${github_1.context.payload.label.name.toLowerCase()}`;
        console.log(`Detected label: ${label}`);
        const regex = core.getInput("environment-regex");
        console.log(`Using regex ${regex} to extract environment`);
        const matcher = RegExp(regex);
        if (!matcher.test(label)) {
            throw new Error("Cannot extract environment from label (no regex match)");
        }
        const matches = label.match(matcher);
        let env = "";
        if (matches) {
            env = matches[1];
        }
        console.log(`Environment is ${env}`);
        core.setOutput("environment", env);
        core.endGroup();
        return {
            label: label,
            env: env
        };
    }
    async createComment(labelInfo) {
        core.startGroup("Create comment");
        const createComment = core.getBooleanInput("create-comment");
        if (createComment) {
            const commentBody = `👋 Request from @${github_1.context.actor} for deployment received using _${labelInfo.label}_ :rocket:`;
            await this.github.rest.issues.createComment({
                ...github_1.context.repo,
                issue_number: github_1.context.issue.number,
                body: commentBody,
            });
            console.log("Created deployment comment!");
        }
        else {
            console.log("Create comment skipped!");
        }
        core.endGroup();
    }
    async invokeDeploymentWorkflow(labelInfo) {
        core.startGroup("Invoke deployment workflow");
        const workflowName = core.getInput("deployment-workflow-name");
        console.log(`Workflow name: ${workflowName}`);
        const additionalInputs = core.getInput("additional-inputs-json");
        let inputs = {
            environment: labelInfo.env
        };
        if (additionalInputs) {
            console.log(`Additional inputs input: ${additionalInputs}`);
            try {
                const addInputsObj = JSON.parse(additionalInputs);
                inputs = {
                    environment: labelInfo.env,
                    ...addInputsObj
                };
            }
            catch (err) {
                console.error("Could not parse additional inputs");
                throw err;
            }
        }
        console.log("Final inputs:");
        console.log(JSON.stringify(inputs));
        console.log("Invoking workflow...");
        await this.github.rest.actions.createWorkflowDispatch({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            workflow_id: workflowName,
            ref: `${github_1.context.payload.pull_request.number}`,
            inputs: inputs
        });
        core.endGroup();
    }
    async removeLabel() {
        console.log("Removing label...");
        await this.github.rest.issues.removeLabel({
            ...github_1.context.repo,
            issue_number: github_1.context.issue.number,
            name: github_1.context.payload.label.name
        });
    }
    async run() {
        this.validate();
        const labelInfo = this.parseLabel();
        await this.createComment(labelInfo);
        await this.invokeDeploymentWorkflow(labelInfo);
        await this.removeLabel();
    }
}
async function run() {
    const token = core.getInput('token');
    await new Runner(token).run();
}
exports.run = run;
exports.runPromise = run();
async function runWrapper() {
    try {
        await exports.runPromise;
    }
    catch (error) {
        core.setFailed(`create-deployment-from-label action failed: ${error}`);
        console.log(error);
    }
}
void runWrapper();
//# sourceMappingURL=create-deployment-from-label.js.map