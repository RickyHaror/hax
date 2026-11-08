import type { FileExplorerConfig } from '../../../engine/types';
import type { WidgetProps } from '../Widget';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { breadcrumbs, findNode, folderName, listFolder } from './tree';
import { useExplorer } from './useExplorer';
import { useFileDrag } from './useFileDrag';
import { ReadingBox } from '../tools/ReadingBox';

function EntryIcon({ folder }: { folder: boolean }) {
  return <svg aria-hidden="true" width="64" height="56" viewBox="0 0 64 56">
    {folder ? <path d="M4 12V6h22l8 8h26v36H4Z" />
      : <><path d="M14 3h25l12 12v38H14Z" /><path d="M39 3v13h12M22 27h21M22 37h21" /></>}
  </svg>;
}
export function FileExplorer(props: WidgetProps<FileExplorerConfig>) {
  const model = useExplorer(props);
  const { drag, start, takeClick } = useFileDrag(model.move);
  const viewer = model.viewer ? findNode(model.tree, model.viewer) : undefined;
  const selectedFile = model.selected && findNode(model.tree, model.selected)?.type === 'file'
    ? model.selected : null;
  return <section class="explorer-widget file-window" aria-label="File explorer">
    <header class="file-title"><SpeechLine line={{ text: folderName(model.folder) }} /></header>
    <nav class="file-crumbs" aria-label="Folders">{breadcrumbs(model.folder).map((crumb) =>
      <BigButton key={crumb.path} aria-current={crumb.path === model.folder ? 'location' : undefined}
        onClick={() => model.navigate(crumb.path)}>{crumb.name}</BigButton>)}</nav>
    <ReadingBox><div class="file-items">{listFolder(model.tree, model.folder).map((entry) => {
      const folder = entry.node.type === 'dir';
      const dragging = drag?.file === entry.path && drag.moved;
      return <div key={entry.path} class="file-entry">
        <BigButton aria-label={entry.name} aria-pressed={model.selected === entry.path}
          data-folder={folder ? entry.path : undefined}
          class={`file-icon${model.highlight === entry.path ? ' file-highlight' : ''}${dragging ? ' file-dragging' : ''}`}
          style={{ transform: dragging ? `translate(${drag.x}px, ${drag.y}px)` : 'translate(0, 0)' }}
          onPointerDown={!folder && props.config.task.type === 'move' ? (event) => start(event, entry.path) : undefined}
          onClick={(event) => { if (takeClick(entry.path, event.detail > 0)) model.select(entry.path); }}
          onDblClick={() => model.open(entry.path)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); model.open(entry.path); }
          }}><EntryIcon folder={folder} /><span>{entry.name}</span></BigButton>
        {folder && selectedFile && props.config.task.type === 'move' &&
          <BigButton onClick={() => model.move(selectedFile, entry.path)}>Move to {entry.name}</BigButton>}
      </div>;
    })}</div>
    {viewer?.type === 'file' && <section class="file-viewer" aria-label={folderName(model.viewer!)}>
      <SpeechLine line={{ text: viewer.content }} />
      <BigButton onClick={model.closeFile}>Close file</BigButton>
    </section>}
    </ReadingBox>
    <div aria-live="polite">{model.message && <SpeechLine line={{ text: model.message }} />}</div>
  </section>;
}
