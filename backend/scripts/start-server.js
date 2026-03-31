import { execFileSync } from 'node:child_process';

const port = Number(process.env.PORT || 5000);

const stopExistingProcess = () => {
  try {
    if (process.platform === 'win32') {
      const command = [
        `$connection = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;`,
        'if (-not $connection) { exit 0 }',
        '$processId = $connection.OwningProcess;',
        'Stop-Process -Id $processId -Force;',
        'Start-Sleep -Milliseconds 500;',
        `Write-Output "Stopped existing process $processId on port ${port}."`,
      ].join(' ');

      execFileSync('powershell.exe', ['-NoProfile', '-Command', command], { stdio: 'inherit' });
      return;
    }

    execFileSync(
      'bash',
      [
        '-lc',
        `pid=$(lsof -ti tcp:${port}); if [ -z "$pid" ]; then exit 0; fi; kill -9 "$pid"; sleep 1; echo "Stopped existing process $pid on port ${port}."`,
      ],
      { stdio: 'inherit' }
    );
  } catch (error) {
    console.error(`Unable to stop the existing process on port ${port}.`, error.message);
    process.exit(1);
  }
};

stopExistingProcess();
await import('../server.js');
