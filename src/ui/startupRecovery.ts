import { UnrecoverableSave } from '../app/saveRepository';
import type { SaveRepository } from '../app/saveRepository';
import { localize } from './locale';
import type { Language } from './locale';

export function showStartupRecovery(cover:HTMLElement,language:Language,error:unknown,repository?:SaveRepository):void {
  const t=(ru:string,en:string)=>localize(language,ru,en);
  const button=(id:string,label:string)=>{
    const node=document.createElement('button');
    node.id=id;node.type='button';node.textContent=label;
    return node;
  };
  const message=document.createElement('p');
  message.setAttribute('role','alert');
  const retry=button('retry-startup',t('Повторить загрузку','Reload'));
  retry.onclick=()=>location.reload();
  cover.hidden=false;
  cover.replaceChildren(message,retry);
  message.textContent=t('Не удалось открыть игру. Повторите загрузку.','Could not open the game. Please reload.');
  if (!(error instanceof UnrecoverableSave) || !repository) return;

  message.textContent=t('Обе копии сохранения повреждены.','Neither saved copy can be opened.');
  const open=button('reset-save-open',t('Начать заново…','Start over…'));
  const dialog=document.createElement('dialog');
  dialog.id='reset-save-dialog';
  dialog.setAttribute('aria-labelledby','reset-save-title');
  const title=document.createElement('h2');
  title.id='reset-save-title';
  title.textContent=t('Начать новую игру?','Start a new game?');
  const warning=document.createElement('p');
  warning.textContent=t('Прогресс, монеты и настройки будут сброшены. Повреждённые данные сохранятся отдельно.',
    'Progress, coins, and settings will reset. The damaged copies will be kept separately.');
  const status=document.createElement('p');
  status.setAttribute('role','alert');
  status.hidden=true;
  const cancel=button('reset-save-cancel',t('Отмена','Cancel'));
  cancel.autofocus=true;
  const confirm=button('reset-save-confirm',t('Сбросить прогресс','Reset progress'));
  const actions=document.createElement('div');
  actions.className='buttons';
  actions.append(cancel,confirm);
  dialog.append(title,warning,actions,status);
  cover.append(open,dialog);
  open.onclick=()=>dialog.showModal();
  cancel.onclick=()=>dialog.close();
  dialog.addEventListener('cancel',event=>{if(confirm.disabled)event.preventDefault();});
  confirm.onclick=async()=>{
    cancel.disabled=confirm.disabled=true;
    status.hidden=true;
    try {
      await repository.resetCorrupt(error);
      location.reload();
    } catch {
      status.textContent=t('Не удалось подтвердить запись. Закройте окно и повторите загрузку.',
        'The write could not be confirmed. Close this window and reload.');
      status.hidden=false;
    } finally { cancel.disabled=confirm.disabled=false; }
  };
}
