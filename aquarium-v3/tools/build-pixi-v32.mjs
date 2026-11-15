import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const vendor=fileURLToPath(new URL('../v32/vendor/',import.meta.url));
const require=createRequire(process.env.PIXI_BUILD_DIR
  ? join(resolve(process.env.PIXI_BUILD_DIR),'package.json') : import.meta.url);
const esbuild=require('esbuild');
const pixiPath=dirname(dirname(require.resolve('pixi.js')));
const pkgFile=join(pixiPath,'package.json');
const pkg=JSON.parse(await readFile(pkgFile,'utf8'));
if (pkg.version!=='8.23.0') throw new Error('Expected PixiJS 8.23.0');

const input=`
import './rendering/init.mjs';
import './scene/mesh/init.mjs';
export { WebGLRenderer } from './rendering/renderers/gl/WebGLRenderer.mjs';
export { Container } from './scene/container/Container.mjs';
export { Mesh } from './scene/mesh/shared/Mesh.mjs';
export { MeshGeometry } from './scene/mesh/shared/MeshGeometry.mjs';
export { MeshPlane } from './scene/mesh-plane/MeshPlane.mjs';
export { MeshRope } from './scene/mesh-simple/MeshRope.mjs';
export { Texture } from './rendering/renderers/shared/texture/Texture.mjs';
export { ImageSource } from './rendering/renderers/shared/texture/sources/ImageSource.mjs';
`;
const {metafile}=await esbuild.build({
  absWorkingDir:pixiPath,
  stdin:{contents:input,resolveDir:join(pixiPath,'lib'),sourcefile:'class-aquarium-pixi-entry.mjs'},
  bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'none',
  metafile:true,banner:{js:'/* PixiJS 8.23.0 (MIT). See PIXI-LICENSES.txt. */'},
  outfile:join(vendor,'pixi-8.23.0.mjs'),
});
const expectedPackages=['pixi.js','colord','earcut','eventemitter3'];
const transitive=new Set(Object.keys(metafile.inputs).flatMap(path=>{
  const parts=resolve(pixiPath,path).replaceAll('\\','/').split('/');
  const index=parts.lastIndexOf('node_modules');
  return index<0 ? [] : [parts[index+1]];
}));
if ([...transitive].some(name=>!expectedPackages.includes(name))) {
  throw new Error('Update third-party notices for the included package set');
}
const notices=[];
for (const [name,licence] of [['pixi.js','LICENSE'],['colord','LICENSE.md'],['earcut','LICENSE'],['eventemitter3','LICENSE']]) {
  const directory=join(pixiPath,'..',name);
  const info=JSON.parse(await readFile(join(directory,'package.json'),'utf8'));
  const text=await readFile(join(directory,licence),'utf8');
  notices.push(`${info.name} ${info.version} (${info.license})\n\n${text.trim()}\n`);
}
await writeFile(join(vendor,'PIXI-LICENSES.txt'),notices.join('\n'));
