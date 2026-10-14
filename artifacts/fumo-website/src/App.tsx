import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
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
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import StaffReport from "@/pages/StaffReport";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { applySeoMetadata, getRouteSeo } from "@/lib/seo";

const queryClient = new QueryClient();

function SeoHead() {
  const [location] = useLocation();
  const { isEnglish } = useLanguage();

  useEffect(() => {
    applySeoMetadata(getRouteSeo(location, isEnglish));
    document.getElementById("seo-fallback")?.remove();
  }, [location, isEnglish]);

  return null;
}

function Router() {
  return (
    <Layout>
      <SeoHead />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/members" component={Members} />
        <Route path="/staff" component={StaffReport} />
        <Route path="/regulations" component={Regulations} />
        <Route path="/charter" component={Charter} />
        <Route path="/votes" component={Votes} />
        <Route path="/votes/create" component={CreateVote} />
        <Route path="/votes/:id" component={VoteDetail} />
        <Route path="/admin" component={Admin} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AuthProvider>
        </LanguageProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
