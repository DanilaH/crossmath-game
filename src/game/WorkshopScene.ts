import Phaser from 'phaser';
export const PRESENTABLE='crossmath:presentable';
/** Quiet paper grid underneath the semantic DOM board; no perpetual render loop. */
export class WorkshopScene extends Phaser.Scene {
  private art!:Phaser.GameObjects.Graphics;
  create():void{this.art=this.add.graphics();this.paint();this.scale.on('resize',this.paint,this);this.events.once('shutdown',()=>this.scale.off('resize',this.paint,this));this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>this.game.events.emit(PRESENTABLE));}
  paint():void{if(!this.art)return;const dark=document.body.classList.contains('dark'),density=Math.min(devicePixelRatio||1,2),step=12*density;this.art.clear().fillStyle(dark?0x213532:0xfffdf5).fillRect(0,0,this.scale.width,this.scale.height).fillStyle(dark?0xc1d8c3:0x345242,.12);for(let x=step/2;x<this.scale.width;x+=step)for(let y=step/2;y<this.scale.height;y+=step)this.art.fillCircle(x,y,.8*density);}
}
