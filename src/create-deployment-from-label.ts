import * as core from "@actions/core";

export async function run() {
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