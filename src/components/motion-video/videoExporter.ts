// High-Definition Canvas-to-Video (WebM/MP4) Recording Engine for Acharya360 ExamTrack

export interface VideoExportOptions {
  width?: number;
  height?: number;
  fps?: number;
  durationSeconds?: number;
  onProgress?: (progress: number, stage: string) => void;
}

export async function exportMotionVideo({
  width = 1920,
  height = 1080,
  fps = 60,
  durationSeconds = 18,
  onProgress,
}: VideoExportOptions = {}): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      // Check MediaRecorder support
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API is not supported in this browser.');
      }

      const stream = canvas.captureStream(fps);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps High Quality
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mimeType });
        // Trigger download
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Acharya360-ExamTrack-Showcase-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        resolve(videoBlob);
      };

      recorder.start();

      const totalFrames = fps * durationSeconds;
      let frame = 0;

      const scenes = [
        { name: '01. Prologue & Identity', duration: 0.18, title: 'ACHARYA360 EXAMTRACK', sub: 'Autonomous Examination Governance' },
        { name: '02. Central Command', duration: 0.22, title: 'CENTRAL COMMAND TELEMETRY', sub: '482 Papers • 45,280 Students • 99.4% Ready' },
        { name: '03. 4-Phase Task Suite', duration: 0.22, title: '4-PHASE AUTO MILESTONES', sub: 'Vault Packaging • Seating • Duties • Counterfoils' },
        { name: '04. 4-Tier Security', duration: 0.18, title: 'MILITARY-GRADE RBAC & RLS', sub: 'COE • DYCOE • ACOE • Fail-Safe Escalation' },
        { name: '05. Academic Registry', duration: 0.20, title: 'LTPS CREDIT ENGINE & TR SHEET', sub: 'SGPA 9.42 • Tamper-Proof Digital Seal' },
      ];

      function renderFrame() {
        const progress = frame / totalFrames;
        const currentSeconds = (frame / fps);

        if (onProgress) {
          const percent = Math.min(100, Math.floor(progress * 100));
          onProgress(percent, `Rendering scene at ${currentSeconds.toFixed(1)}s / ${durationSeconds}s (${percent}%)`);
        }

        // Determine active scene
        let accumulated = 0;
        let activeScene = scenes[0];
        for (const s of scenes) {
          accumulated += s.duration;
          if (progress <= accumulated) {
            activeScene = s;
            break;
          }
        }

        // Clear Background with Deep Cosmic Gradient
        const grad = ctx!.createRadialGradient(
          width / 2, height / 2, 50,
          width / 2, height / 2, width * 0.8
        );
        grad.addColorStop(0, '#110c26');
        grad.addColorStop(0.5, '#0b0f19');
        grad.addColorStop(1, '#030712');
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, width, height);

        // Animated Perspective Cyber Grid
        ctx!.strokeStyle = 'rgba(139, 92, 246, 0.08)';
        ctx!.lineWidth = 1;
        const gridSize = 60;
        const gridOffset = (frame * 1.5) % gridSize;

        for (let x = gridOffset; x < width; x += gridSize) {
          ctx!.beginPath();
          ctx!.moveTo(x, 0);
          ctx!.lineTo(x, height);
          ctx!.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx!.beginPath();
          ctx!.moveTo(0, y);
          ctx!.lineTo(width, y);
          ctx!.stroke();
        }

        // Ambient Glowing Orb in Center
        const pulse = Math.sin(frame * 0.05) * 40;
        const glowGrad = ctx!.createRadialGradient(
          width / 2, height / 2, 10,
          width / 2, height / 2, 320 + pulse
        );
        glowGrad.addColorStop(0, 'rgba(124, 58, 237, 0.25)');
        glowGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.12)');
        glowGrad.addColorStop(1, 'transparent');
        ctx!.fillStyle = glowGrad;
        ctx!.fillRect(0, 0, width, height);

        // Render HUD Frame & Timecode
        ctx!.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx!.font = 'bold 22px "JetBrains Mono", monospace';
        ctx!.fillText(`REC ● [60 FPS HDR]`, 80, 80);
        ctx!.fillText(`TC 00:${currentSeconds.toFixed(2).padStart(5, '0')} / 00:${durationSeconds}.00`, width - 360, 80);

        // Header Category Badge
        ctx!.fillStyle = '#8b5cf6';
        ctx!.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
        ctx!.fillText(activeScene.name.toUpperCase(), width / 2 - 120, height / 2 - 140);

        // Main Title (Chrome White & Gradient)
        ctx!.fillStyle = '#ffffff';
        ctx!.font = '900 64px "Plus Jakarta Sans", sans-serif';
        ctx!.textAlign = 'center';
        ctx!.fillText(activeScene.title, width / 2, height / 2 - 50);

        // Subtitle
        ctx!.fillStyle = '#94a3b8';
        ctx!.font = '500 28px "Plus Jakarta Sans", sans-serif';
        ctx!.fillText(activeScene.sub, width / 2, height / 2 + 10);

        // Lower Progress Bar Line
        ctx!.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx!.fillRect(80, height - 90, width - 160, 6);
        ctx!.fillStyle = '#8b5cf6';
        ctx!.fillRect(80, height - 90, (width - 160) * progress, 6);

        // Bottom Brandmark
        ctx!.fillStyle = '#e2e8f0';
        ctx!.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
        ctx!.fillText('ACHARYA360 EXAMTRACK • ENTERPRISE UNIVERSITY ERP', width / 2, height - 50);

        frame++;
        if (frame < totalFrames) {
          requestAnimationFrame(renderFrame);
        } else {
          recorder.stop();
        }
      }

      renderFrame();
    } catch (err) {
      reject(err);
    }
  });
}
