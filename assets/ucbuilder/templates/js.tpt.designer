<?php for(let i=0;i<designer.importClasses.length;i++){ let $rw=designer.importClasses[i]; ?>
import { <?=$rw.importText?> } from "<?=$rw.url?>";<?php } ?>
 /**
 *  code filename must same and case sensitive with classname   ---------------
 */
import { <?=src.name?> } from "<?=codeFilePath?>";

    
<?php for(let j=0;j<designer.templetes.length;j++){ let $tpt=designer.templetes[j]; ?>
/**
 * @typedef <?=$tpt.name?>_ELEMENT_MAP
 <?php for(let i=0;i<$tpt.controls.length;i++){ let $rw=$tpt.controls[i]; ?>
 * @prop {<?=$rw.proto?><?=$rw.generic?>} <?=$rw.nameQT?> The street
 <?php } ?>
 */
class <?=$tpt.name?>_TEMPLATE extends TemplateNode{
    constructor(tpt:Template) { super(tpt);   }
    /**
     * @param {HTMLElement} elementHT 
     * @returns {<?=$tpt.name?>_ELEMENT_MAP}
     */
    getAllControls(elementHT) {
        return this.extended.getAllControls(undefined,elementHT);
    }
}
<?php } ?>


/**
 * @typedef dMap_<?=src.name?>
 <?php for(let j=0;j<designer.templetes.length;j++){ let $tpt=designer.templetes[j]; ?>
 * @prop {<?=$tpt.name?>_ELEMENT_MAP} <?=$tpt.name?> The street
 <?php } ?>
 */
/** @type {dMap_<?=src.name?>}  */ 
export const cMap_<?=src.name?>= {};

export class <?=designer.className ?> extends Template {
    /** <?=src.mainBase.rootWithExt?>
     *  AUTO RENAMING IS DEPEND ON `_FILE_PATH` SO KEEP YOUR SELF FAR FROM THIS :-)
     */
    private static _FILE_PATH =  '<?=src.html.rootPath?>'; //window.atob('<?=src.mainFileRootPath_btoa?>');
    public static get FILE_PATH() {
        return Designer._FILE_PATH;
    }
    /**
     * @param {VariableList} varList 
     * @returns {void}
     */
    static setCSS_globalVar (varList)  {
        intenseGenerator.setCSS_globalVar(varList,this.FILE_PATH);
    }
    /**
     * @param {ITptOptions} pera 
     * @returns {gstSupplyBluePrintRow}
     */
    static Create(pera)  { 
        return intenseGenerator.generateTPT(this.FILE_PATH,<?=src.name?>,import.meta.url,pera) as <?=src.name?>;
    }

     
    <?php for(let j=0;j<designer.templetes.length;j++){ let $tpt=designer.templetes[j]; ?>
    public&nbsp;<?=$tpt.name?>:<?=$tpt.name?>_TEMPLATE;<?php } ?>
    /**
     * @param {IArguments} args 
     * @returns 
     */
    constructor(args:IArguments){    
        let aargs = Template.extractArgs(arguments);
        let fargs = aargs[aargs.length - 1] as ITptOptions;
        super(fargs);    
        //this.extended.parentUc = fargs.parentUc;
        //let fargs = Template.extractArgs(arguments) as TptOptions;
        if(fargs.MakeEmptyTemplate)return;
        //fargs = fargs[fargs.length-1] as TptOptions;
        //let ext = this.extended;
        let oot = Template.GetObjectOfTemplate(fargs.cfInfo);
        let tpts = oot.tptObj;
       
        <?php for(let j=0;j<designer.templetes.length;j++){ let $tpt=designer.templetes[j]; ?>
        this.<?=$tpt.name ?> = new <?=$tpt.name ?>_TEMPLATE(this); // ext._templeteNode as <?=$tpt.name?>_TEMPLATE;
        this.<?=$tpt.name?>.extended.initializecomponent(fargs,tpts['<?=$tpt.name?>']); 
        <?php } ?>

        if (oot.outerCSS.trim() != '')
            this.pushTemplateCss(oot.outerCSS);
        //console.log(oot.outerCSS);
        //fargs.elementHT.remove();
    }
}