import {makeAutoObservable} from "mobx";

class Data{

    districtInfo = {}
    selectedType = 'pharmacy'
    newPrice= 0

    constructor() {
        makeAutoObservable(this)
    }
}
export  const ddd = new Data()