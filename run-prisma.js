const { spawn } = require('child_process');
const child = spawn('prisma', ['generate'], {
  cwd: 'C:\\Users\\paser\\Music\\CRM\\backend',
  stdio: 'inherit',
  shell: true
});
child.on('close', (code) => {
  process.exit(code);
});