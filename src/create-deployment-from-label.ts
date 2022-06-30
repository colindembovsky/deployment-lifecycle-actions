import * as core from "@actions/core";
import {context, getOctokit} from '@actions/github';
import {GitHub} from '@actions/github/lib/utils';

interface ILabelInfo {
    label: string,
    env: string
}

class Runner {
    private github: InstanceType<typeof GitHub>;

    constructor(token: string) {
        this.github = getOctokit(token);
    }

    validate() {
        if (!context.payload.pull_request || !context.payload.label) {
            throw new Error("This action must be run from a PR 'labeled' event");
        }
    }

    parseLabel(): ILabelInfo {
        core.startGroup("Create comment");

        const label = `${context.payload.label.name.toLowerCase()}`;
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

        return <ILabelInfo>{
            label: label,
            env: env
        };
    }

    async createComment(labelInfo: ILabelInfo) {
        core.startGroup("Create comment");
        
        const createComment = core.getBooleanInput("create-comment");
        if (createComment) {
            const commentBody = `👋 Request from @${context.actor} for deployment received using _${labelInfo.label}_ :rocket:`;
            await this.github.rest.issues.createComment({
                ...context.repo,
                issue_number: context.issue.number,
                body: commentBody,
            });
            console.log("Created deployment comment!")
        } else {
            console.log("Create comment skipped!")
        }
        
        core.endGroup();
    }
    
    async invokeDeploymentWorkflow(labelInfo: ILabelInfo) {
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
            } catch (err) {
                console.error("Could not parse additional inputs");
                throw err;
            }
        }
        console.log("Final inputs:");
        console.log(JSON.stringify(inputs));

        console.log("Invoking workflow...");
        await this.github.rest.actions.createWorkflowDispatch({
            owner: context.repo.owner,
            repo: context.repo.repo,
            workflow_id: workflowName,
            ref: `${context.payload.pull_request!.number}`,
            inputs: inputs
        });

        core.endGroup();
    }

    async removeLabel() {
        console.log("Removing label...")
        await this.github.rest.issues.removeLabel({
            ...context.repo,
            issue_number: context.issue.number,
            name: context.payload.label.name
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

export async function run() {
    const token = core.getInput('token');
    await new Runner(token).run();
}

export const runPromise = run();

async function runWrapper() {
  try {
    await runPromise;
  } catch (error) {
    core.setFailed(`create-deployment-from-label action failed: ${error}`);
    console.log(error);
  }
}

void runWrapper();