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
exports.run = exports.Runner = void 0;
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
class Runner {
    constructor(github, context) {
        this.github = github;
        this.context = context;
    }
    async run() {
        if (!this.context.payload.pull_request) {
            throw new Error("This action must be run from a PR event");
        }
        const ref = this.context.payload.pull_request.head.ref;
        // This will transition the environments to failure to trigger clean up and then inactivate them
        // Deployment status 'inactive' does not trigger Github Actions
        // see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#deployment_status
        await this.deactivateIntegrationDeployments(ref);
    }
    async deactivateIntegrationDeployments(ref) {
        const context = this.context, github = this.github;
        // TODO might need to contend with pagination, but in practice this should not be an issue as we are limiting on ref
        return github.rest.repos.listDeployments({
            ...context.repo,
            ref: ref,
            per_page: 100,
        }).then(deployments => {
            const promises = [];
            deployments.data.forEach(deployment => {
                promises.push(github.rest.repos.listDeploymentStatuses({
                    ...context.repo,
                    deployment_id: deployment.id,
                    per_page: 100,
                }).then(statuses => {
                    if (statuses.data) {
                        // The first state is the most current state for the deployment
                        const currentState = statuses.data[0].state;
                        // Ignore deployments that are already inactive or in failure state
                        if (currentState !== 'inactive' && currentState !== 'failure') {
                            return this.transitionPrDeploymentToFailure(deployment)
                                .then(() => {
                                // Pause so that status updates can cascade through and trigger clean up workflows
                                core.info("Sleeping to wait for transition...");
                                return this.sleep(15);
                            })
                                .then(() => {
                                core.info(`Deployment: ${deployment.id}:${deployment.environment} transitioning to inactive`);
                                return github.rest.repos.createDeploymentStatus({
                                    ...context.repo,
                                    mediaType: { previews: ["flash", "ant-man"] },
                                    deployment_id: deployment.id,
                                    state: 'inactive',
                                    description: 'Pull Request Merged/Closed, inactivating'
                                });
                            });
                        }
                        else {
                            return {};
                        }
                    }
                    else {
                        return {};
                    }
                }));
            });
            return Promise.all(promises);
        });
    }
    async transitionPrDeploymentToFailure(deployment) {
        const context = this.context, github = this.github;
        core.info(`Deployment: ${deployment.id}:${deployment.environment} transitioning to failure`);
        return github.rest.repos.createDeploymentStatus({
            ...context.repo,
            mediaType: { previews: ["flash", "ant-man"] },
            deployment_id: deployment.id,
            state: 'failure',
            description: 'Pull Request Merged/Closed, triggering removal'
        });
    }
    async sleep(seconds) {
        const mult = process.env["ISTEST"] ? 1 : 1000;
        return new Promise(resolve => { setTimeout(resolve, seconds * mult); });
    }
    async getAllDeployments(environment) {
        const context = this.context;
        return this.github.paginate('GET /repos/:owner/:repo/deployments', {
            ...context.repo,
            environment: environment
        });
    }
    async inactivateDeployment(deploymentId) {
        const context = this.context, github = this.github;
        //TODO this may not be necessary as we should not have a long list of deployment statuses, we could just use listDeploymentStatuses()
        return github.paginate('GET /repos/:owner/:repo/deployments/:deployment_id/statuses', {
            ...context.repo,
            deployment_id: deploymentId
        }).then((statuses) => {
            if (statuses && statuses.length > 0) {
                const currentStatus = statuses[0].state;
                if (currentStatus !== 'inactive') {
                    return github.rest.repos.createDeploymentStatus({
                        ...context.repo,
                        deployment_id: deploymentId,
                        state: 'inactive',
                        mediaType: { previews: ['flash', 'ant-man'] }
                    });
                }
                else {
                    return {};
                }
            }
            return {};
        });
    }
}
exports.Runner = Runner;
async function run() {
    const token = core.getInput('token');
    const github = (0, github_1.getOctokit)(token);
    await new Runner(github, github_1.context).run();
}
exports.run = run;
async function runWrapper() {
    try {
        if (process.env["ISTEST"]) {
            console.log("testing");
        }
        else {
            await run();
        }
    }
    catch (error) {
        core.setFailed(`create-deployment-from-label action failed: ${error}`);
        console.log(error);
    }
}
void runWrapper();
//# sourceMappingURL=deactivate-deployments.js.map