import {
  PayloadAction,
  createAsyncThunk,
  createSlice,
  current,
  original,
} from "@reduxjs/toolkit";

const stringify = function (obj: any) {
  return JSON.stringify(obj, function (_, value) {
    if (value instanceof Function || typeof value == "function") {
      let fnBody = value.toString();
      if (fnBody.length < 8 || fnBody.substring(0, 8) !== "function") {
        //this is ES6 Arrow Function
        return "_NuFrRa_" + fnBody;
      }
      return fnBody;
    }
    return value;
  });
};

const buildWorker = function () {
  if (typeof Worker === "undefined") {
    throw "Web worker is not supported";
  }
  return new Worker(new URL("./worker.js", import.meta.url), {
    type: "module",
  });
};

type Dependencies = { [key: string]: URL };
type WorkerInfo = {
  id: string;
  data: any;
  // worker: Worker;
  pending: boolean;
};
interface InitialState {
  workers: { [key: string]: WorkerInfo };
}

interface Options {
  dependencies: Dependencies;
}

export const buildWorkerSlice = ({ dependencies }: Options) => {
  const name = "@worker";
  const initialState: InitialState = {
    workers: {},
  };
  let deps = {};
  Object.keys(dependencies).forEach((key) => {
    deps = { ...deps, [key]: dependencies[key].href };
  });

  const workerSlice = createSlice({
    initialState,
    name,
    extraReducers: (builder) => {
      builder.addCase(exec.pending, (state, action) => {});
      builder.addCase(exec.fulfilled, (state, action) => {
        const { id } = action.meta.arg;
        const { data } = action.payload;
        state.workers[id] = {
          ...state.workers[id],
          pending: false,
          data,
        };
      });
    },
    reducers: {
      initialize(state, action: PayloadAction<{ id: string }>) {
        const { id } = action.payload;
        state.workers[id] = {
          id,
          pending: true,
          data: null,
        };
      },
    },
  });

  const { initialize } = workerSlice.actions;
  const exec = createAsyncThunk(
    `${name}/exec`,
    async (
      { id, func }: { id: string; func: () => Promise<any> },
      thunkAPI
    ) => {
      const worker = buildWorker();
      thunkAPI.dispatch(initialize({ id }));
      return new Promise<any>((resolve) => {
        worker.onmessage = function (e) {
          worker.terminate();
          resolve(e);
        };
        worker.postMessage([stringify(func), deps]);
      });
    }
  );

  const workerFunction = (func: () => Promise<any>) => {

  }

  return { workerSlice, workerActions: { exec } };
};