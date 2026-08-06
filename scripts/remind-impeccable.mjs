#!/usr/bin/env node
/**
 * Lembra de impeccable quando feature toca frontend
 * Roda antes do push (via lefthook pre-push)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  // Detecta se há mudanças em apps/web/src/interfaces ou apps/web/src/features
  const diff = execSync('git diff HEAD origin/main --name-only 2>/dev/null || git diff --cached --name-only', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });

  const hasUI = diff.split('\n').some(file =>
    file.includes('apps/web/src/interfaces/') ||
    file.includes('apps/web/src/features/') ||
    file.includes('.tsx') && file.includes('apps/web')
  );

  if (!hasUI) return process.exit(0);

  // Se toca UI, verifica se tasks.md menciona impeccable
  const taskFiles = [
    'specs/**/tasks.md',
    'specs/*/tasks.md',
  ];

  let foundTask = false;
  try {
    const glob = (await import('glob')).glob;
    const tasks = await glob('specs/*/tasks.md');
    foundTask = tasks.length > 0;
  } catch {
    // glob não importou, check manual
    try {
      execSync('find specs -name "tasks.md" -type f', { stdio: 'ignore' });
      foundTask = true;
    } catch {}
  }

  if (!foundTask) return process.exit(0);

  // Avisa sobre impeccable
  console.log('\n');
  console.log('⚠️  Mudanças em UI detectadas!');
  console.log('');
  console.log('Antes de fazer push, execute:');
  console.log('  /impeccable');
  console.log('');
  console.log('Ou preencha checklist manualmente:');
  console.log('  .claude/skills/impeccable/checklist-antes-depois.md');
  console.log('');
  console.log('Impeccable é OBRIGATÓRIO no Definition-of-Done.');
  console.log('Ver: Definition-of-Done.md seção 7');
  console.log('\n');

} catch (error) {
  // Silencioso se erro (não bloqueia push, só avisa)
  process.exit(0);
}
