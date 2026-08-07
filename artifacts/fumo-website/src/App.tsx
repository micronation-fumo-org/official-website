import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Members from "@/pages/Members";
import Regulations from "@/pages/Regulations";
import Charter from "@/pages/Charter";
import Votes from "@/pages/Votes";
import VoteDetail from "@/pages/VoteDetail";
import CreateVote from "@/pages/CreateVote";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/members" component={Members} />
        <Route path="/regulations" component={Regulations} />
        <Route path="/charter" component={Charter} />
        <Route path="/votes" component={Votes} />
        <Route path="/votes/create" component={CreateVote} />
        <Route path="/votes/:id" component={VoteDetail} />
        <Route path="/admin" component={Admin} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
