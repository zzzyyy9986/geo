import {createContext, useContext} from "react";
import {ddd} from "./Test";

const store = {
    mainData:ddd,
}
export const StoreContext = createContext(store);

export const useStore = () => {
    return useContext(StoreContext);
};