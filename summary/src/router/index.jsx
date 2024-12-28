import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import VideoList from "../pages/VideoList";
import VideoFolder from "../pages/VideoFolder";
import VideoPlayer from "../pages/VideoPlayer";
import Settings from "../pages/Settings";
import Documents from "../pages/Documents";
import PrivateRoute from "../components/PrivateRoute";
import Dictionary from "../pages/Dictionary";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PrivateRoute element={<MainLayout />} />,
    children: [
      {
        path: "",
        element: <VideoList />,
      },
      {
        path: "home",
        element: <VideoList />,
      },
      {
        path: "videos",
        element: <VideoList />,
      },
      {
        path: "videos/folder/:sourceId",
        element: <VideoFolder />,
      },
      {
        path: "videos/player",
        element: <VideoPlayer />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "documents",
        element: <Documents />,
      },
      {
        path: "dictionary",
        element: <Dictionary />,
      },
    ],
  },
]);
