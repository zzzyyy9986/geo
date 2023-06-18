import {makeAutoObservable} from "mobx";

class Data{

    districtInfo = {}
    selectedType = 'pharmacy'

    constructor() {
        makeAutoObservable(this)
    }
}
export  const ddd = new Data()