import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '../../..');
const skillsDirectory = path.join(repositoryRoot, 'skills');
const { version: packageVersion } = JSON.parse(
  readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
) as { version: string };

const skillNames = readdirSync(skillsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe('skills documented hcli version', () => {
  it('finds at least one skill', () => {
    expect(skillNames.length).toBeGreaterThan(0);
  });

  describe.each(skillNames)('%s', (skillName) => {
    const skillContent = readFileSync(
      path.join(skillsDirectory, skillName, 'SKILL.md'),
      'utf8',
    );

    it('declares in the frontmatter the version in package.json', () => {
      const frontmatter = skillContent.match(/^---\n([\s\S]*?)\n---/)?.[1];
      const declaredVersion = frontmatter?.match(
        /^\s+hcli-version:\s*(\S+)\s*$/m,
      )?.[1];

      expect(declaredVersion).toBe(packageVersion);
    });

    it('states in the body the version in package.json', () => {
      expect(skillContent).toContain(
        `**Documented version: hcli \`${packageVersion}\`.**`,
      );
    });
  });
});
