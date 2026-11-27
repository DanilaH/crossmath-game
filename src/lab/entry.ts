import '../style.css';
import '../ui/theme.css';
import '../ui/play.css';
import '../ui/hub.css';
import '../ui/home.css';
import '../ui/menuScreens.css';
import '../ui/rootNavigation.css';
import '../ui/workshopReveal.css';
import './contentLab.css';
void import('./contentLab').catch(error=>{
 const cover=document.getElementById('startup')!;
 cover.textContent='Не удалось открыть лабораторию. '+String(error);
});
