import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { GitHub } from "@actions/github/lib/utils";

export interface IDeployment {
    id: number;
    environment: string
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

    async deactivateIntegrationDeployments(ref: string) {
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
  
    async transitionPrDeploymentToFailure(deployment: IDeployment) {
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
        const mult = process.env["ISTEST"] ? 1 : 1000;
        return new Promise(resolve => { setTimeout(resolve, seconds * mult) });
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