import { regulations, regulationCategories, regulationsDirectoryUrl, charterUrlZh, charterUrlEn } from "@/data/regulations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Book, CheckCircle2, Clock, PenTool } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Regulations() {
  const { isEnglish } = useLanguage();
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "pending": return <Clock className="w-4 h-4 text-amber-600" />;
      case "draft": return <PenTool className="w-4 h-4 text-slate-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "complete": return isEnglish ? "Active" : "已生效";
      case "pending": return isEnglish ? "Pending" : "審議中";
      case "draft": return isEnglish ? "Draft" : "草案";
      default: return status;
    }
  };

  // Group regulations by category
  const groupedRegulations = Object.keys(regulationCategories).map(catKey => {
    const category = catKey as keyof typeof regulationCategories;
    return {
      category,
      info: regulationCategories[category],
      items: regulations.filter(r => r.category === category)
    };
  }).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen bg-muted/10 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-4">{isEnglish ? "Regulations and Documents" : "法規與文件"}</h1>
          <p className="text-foreground/70 mb-8">
            {isEnglish ? "FUMO’s legal and regulatory framework. Official documents are hosted on HackMD for transparency and version control." : "聯合微國家組織的法律與規範體系。所有官方文件與法規均存放於 HackMD 以確保公開透明與版本控制。"}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="bg-primary">
              <a href={regulationsDirectoryUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Book className="w-5 h-5" />
                {isEnglish ? "Regulations directory" : "完整法規目錄"}
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary text-primary">
              <a href={isEnglish ? charterUrlEn : charterUrlZh} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                {isEnglish ? "FUMO Charter" : "聯合微國家組織憲章"}
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </Button>
          </div>
        </div>

        <div className="space-y-16">
          {groupedRegulations.map((group, groupIndex) => (
            <motion.div 
              key={group.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-border/60">
                <h2 className="text-2xl font-bold text-primary">{isEnglish ? group.info.labelEn : group.info.label}</h2>
                <span className="text-muted-foreground text-sm font-medium px-2 py-1 bg-muted rounded-md">{group.info.labelEn}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {group.items.map((reg, index) => (
                  <Card key={reg.hackmdPath} className="flex flex-col bg-white hover:shadow-md transition-all border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <Badge 
                          variant="secondary" 
                          className={`
                            ${reg.status === 'complete' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                            ${reg.status === 'pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : ''}
                            ${reg.status === 'draft' ? 'bg-slate-100 text-slate-800 hover:bg-slate-100' : ''}
                            flex items-center gap-1.5 py-1 shrink-0
                          `}
                        >
                          {getStatusIcon(reg.status)}
                          {getStatusLabel(reg.status)}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl leading-tight text-primary">{isEnglish && reg.nameEn ? reg.nameEn : reg.name}</CardTitle>
                      {!isEnglish && reg.nameEn && <CardDescription className="text-sm font-medium mt-1">{reg.nameEn}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-foreground/70">{isEnglish ? `Official document: ${reg.nameEn || reg.name}.` : (reg.description || "暫無說明。")}</p>
                    </CardContent>
                    <CardFooter className="pt-4 border-t border-border/40">
                      <Button asChild variant="ghost" className="w-full text-secondary hover:text-secondary hover:bg-secondary/10 justify-between">
                        <a href={`https://hackmd.io/${isEnglish ? (reg.hackmdPathEn || reg.hackmdPath) : reg.hackmdPath}`} target="_blank" rel="noopener noreferrer">
                          {isEnglish ? "Read full text" : "閱讀全文"}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
