import { Route, Switch } from "wouter";
import Layout from "./components/Layout.js";
import Home from "./pages/Home.js";
import Login from "./pages/Login.js";
import Register from "./pages/Register.js";
import Game from "./pages/Game.js";
import Results from "./pages/Results.js";
import Leaderboard from "./pages/Leaderboard.js";
import Profile from "./pages/Profile.js";
import AdminStatements from "./pages/AdminStatements.js";

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/game" component={Game} />
        <Route path="/results/:sessionId" component={Results} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin/statements" component={AdminStatements} />
        <Route>
          <div className="flex items-center justify-center min-h-[60vh]">
            <h1 className="text-2xl text-text-secondary">Página não encontrada</h1>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}
