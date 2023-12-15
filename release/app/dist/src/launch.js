import { spawn } from 'child_process';
try {
    spawn(process.argv0, ['--disallow-code-generation-from-strings', './app/dist/src/engine.js'], { stdio: 'ignore', detached: true });
    process.exit(0);
}
catch (error) {
    console.log('Error launching Antistatic:', error);
}
//# sourceMappingURL=launch.js.map