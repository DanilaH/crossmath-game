import Phaser from 'phaser';
export const PRESENTABLE='crossmath:presentable';
/** Quiet play surface underneath the semantic DOM board; no perpetual render loop. */
export class WorkshopScene extends Phaser.Scene {
  private art!:Phaser.GameObjects.Graphics;
  create():void{this.art=this.add.graphics();this.paint();this.scale.on('resize',this.paint,this);this.events.once('shutdown',()=>this.scale.off('resize',this.paint,this));this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>this.game.events.emit(PRESENTABLE));}
  paint():void {
    this.art?.clear(); // The semantic board and CSS desk provide the visible surface.
  }
}
