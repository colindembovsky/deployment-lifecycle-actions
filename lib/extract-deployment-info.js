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
    constructor(context) {
        this.context = context;
    }
    run() {
        if (this.context.eventName !== "deployment_status") {
            throw new Error("This Action only works for 'deployment_status' triggers");
        }
        const deployment = this.context.payload.deployment;
        core.startGroup('Set outputs');
        this.setOutput('deployment_ref', deployment.ref);
        this.setOutput('environment', deployment.environment);
        core.endGroup();
    }
    setOutput(name, value) {
        core.setOutput(name, value);
        core.info(`   ${name}: ${value}`);
    }
}
exports.Runner = Runner;
function run() {
    new Runner(github_1.context).run();
}
exports.run = run;
function runWrapper() {
    try {
        if (process.env["ISTEST"]) {
            console.log("testing");
        }
        else {
            run();
        }
    }
    catch (error) {
        core.setFailed(`create-deployment-from-label action failed: ${error}`);
        console.log(error);
    }
}
void runWrapper();
//# sourceMappingURL=extract-deployment-info.js.map