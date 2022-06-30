import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { WebhookPayload } from "@actions/github/lib/interfaces";
import { GitHub } from "@actions/github/lib/utils";

interface IDeployment {
    id: number;
}

export class Runner {
    constructor(private github: InstanceType<typeof GitHub>, private context: Context) { }
  
    async run() {
        this.validate();

        const ref = this.context.payload!.pull_request!.head!.ref;
        // This will transition the environments to failure to trigger clean up and then inactivate them
        // Deployment status 'inactive' does not trigger Github Actions
        // see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#deployment_status
        await this.deactivateIntegrationDeployments(ref);
    }

    validate() {
        if (!this.context.payload.pull_request) {
            throw new Error("This action must be run from a PR event");
        }
    }

    async updateDeployment(deploymentId: number, state: string, description: string, environmentUrl: string) {
        const github = this.github,
        context = this.context,
        url = this.cleanEnvironmentUrl(environmentUrl)
        ;

        core.info(`Deployed Environment url: '${url}'`);

        const deployment = await github.rest.repos.getDeployment({
            ...context.repo,
            deployment_id: deploymentId
        }).then(resp => {
            return resp.data;
        });

        const payload: WebhookPayload = {
            ...context.repo,
            deployment_id: deployment.id,
            state: state,
            mediaType: {
                previews: ['ant-man', 'flash']
            }
        };

        if (environmentUrl) {
            payload.environment_url = url;
        }

        if (description) {
            payload.description = description;
        }

        // Update the the deployment state
        await github.rest.repos.createDeploymentStatus(payload as any);

        if (state === 'success') {
            // Get all deployments for the specified environment
            const allDeployments = await this.getAllDeployments(deployment.environment) as IDeployment[];

            // Inactivate any previous environments
            const promises: any[] = [];

            allDeployments.forEach(deployment => {
                // If this a previous deployment, ensure it is inactive.
                if (deployment.id !== deploymentId) {
                    promises.push(this.inactivateDeployment(deployment.id));
                }
            });

            return Promise.all(promises);
        }
        throw new Error("Call to createDeploymentStatus() failed");
    }
  
    cleanEnvironmentUrl(envUrl: string) {
        // Terraform has started putting out quoted strings now, so we have to clean them up
        let result = envUrl.trim();

        const regex = /^"(.*)"$/;
        if (regex.test(result)) {
            result = regex.exec(result)![1];
        }
        return result;
    }
  
    async deactivateIntegrationDeployments(ref) {
        const context = this.context
        , github = this.github
        ;

        // TODO might need to contend with pagination, but in practice this should not be an issue as we are limiting on ref
        return github.rest.repos.listDeployments({
            ...context.repo,
            ref: ref,
            per_page: 100,
        }).then(deployments => {
            const promises: any[] = [];
    
            deployments.data.forEach(deployment => {
                promises.push(
                    github.rest.repos.listDeploymentStatuses({
                        ...context.repo,
                        deployment_id: deployment.id,
                        per_page: 100,
                    }).then(statuses => {
                        if (statuses.data) {
                            // The first state is the most current state for the deployment
                            const currentState = statuses.data[0].state;
            
                            // Ignore deployments that are already inactive
                            if (currentState !== 'inactive') {
                                // Ignore environments that are already in failure state
                                if (currentState !== 'failure') {
                                    return this.transitionPrDeploymentToFailure(deployment)
                                    .then(() => {
                                        // Pause so that status updates can cascade through and trigger clean up workflows
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
                                } else {
                                    return {};
                                }
                            } else {
                                return {};
                            }
                        } else {
                            return {};
                        }
                    })
                );
            });
  
            return Promise.all(promises);
        });
    }
  
    async transitionPrDeploymentToFailure(deployment) {
        const context = this.context
        , github = this.github
        ;

        core.info(`Deployment: ${deployment.id}:${deployment.environment} transitioning to failure`);

        return github.rest.repos.createDeploymentStatus({
            ...context.repo,
            mediaType: { previews: ["flash", "ant-man"] },
            deployment_id: deployment.id,
            state: 'failure',
            description: 'Pull Request Merged/Closed, triggering removal'
        });
    }
  
    async sleep(seconds: number) {
        return new Promise(resolve => { setTimeout(resolve, seconds * 1000) });
    }
  
    async getAllDeployments(environment: string) {
        const context = this.context;

        return this.github.paginate('GET /repos/:owner/:repo/deployments', {
            ...context.repo,
            environment: environment
        });
    }
  
    async inactivateDeployment(deploymentId: number) {
        const context = this.context,
            github = this.github
        ;

        //TODO this may not be necessary as we should not have a long list of deployment statuses, we could just use listDeploymentStatuses()
        return github.paginate('GET /repos/:owner/:repo/deployments/:deployment_id/statuses', {
            ...context.repo,
            deployment_id: deploymentId
        }).then((statuses: any[]) => {
            if (statuses && statuses.length > 0) {
                const currentStatus = statuses[0].state;

                if (currentStatus !== 'inactive') {
                    return github.rest.repos.createDeploymentStatus({
                        ...context.repo,
                        deployment_id: deploymentId,
                        state: 'inactive',
                        mediaType: { previews: ['flash', 'ant-man'] }
                    });
                } else {
                    return { };
                }
            }
            return { };
        });
    }
}

export async function run() {
    const token = core.getInput('token');
    const github = getOctokit(token);
    await new Runner(github, context).run();
}

async function runWrapper() {
    try {
        if (process.env["ISTEST"]) {
            console.log("testing")
        } else {
            await run();
        }
    } catch (error) {
        core.setFailed(`create-deployment-from-label action failed: ${error}`);
        console.log(error);
    }
}

void runWrapper();