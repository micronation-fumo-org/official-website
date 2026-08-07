import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Scale, Shield, Globe, Award } from "lucide-react";

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-background to-muted/30 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/10 via-background to-background" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10 py-20 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-10"
          >
            <div className="relative p-2 bg-white rounded-sm shadow-2xl border border-border/50">
              <img 
                src="/fumo-flag.png" 
                alt="FUMO Flag" 
                className="w-48 md:w-64 h-auto object-contain"
              />
              <div className="absolute -inset-4 bg-secondary/20 blur-2xl -z-10 rounded-full" />
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-primary mb-4"
          >
            聯合微國家組織
          </motion.h1>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-xl md:text-3xl text-foreground/80 font-medium mb-8"
          >
            Federation of United Micronations Organisation
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="h-px w-12 bg-secondary" />
            <p className="text-lg md:text-xl font-medium tracking-widest text-secondary">
              維護和平，促進合作
            </p>
            <div className="h-px w-12 bg-secondary" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href="/members">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white min-w-[200px] h-14 text-lg">
                探索成員國 Explore Members
              </Button>
            </Link>
            <Link href="/charter">
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/5 min-w-[200px] h-14 text-lg">
                閱讀憲章 Read Charter
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">關於組織 About FUMO</h2>
            <div className="w-16 h-1 bg-secondary mx-auto mb-8" />
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              聯合微國家組織（FUMO）是一個致力於維護微國家間和平、促進合作與交流的國際性組織。我們提供一個公正、客觀的平台，讓各個主權實體能夠在平等的基礎上進行對話、調解爭端，並共同推動微國家社群的繁榮與穩定。
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed">
              目前，組織擁有近百個成員國與觀察國，涵蓋多種政治體制與文化背景，展現了微國家社群的多元與活力。
            </p>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="py-24 bg-muted/50 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">核心支柱 Core Pillars</h2>
            <div className="w-16 h-1 bg-secondary mx-auto" />
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto"
          >
            {[
              { icon: Shield, title: "維護和平 Peace", desc: "消弭威脅，防止衝突，維護微國家間的和諧。" },
              { icon: Globe, title: "促進合作 Cooperation", desc: "推動經濟、文化及社會領域的跨國合作。" },
              { icon: Award, title: "尊重主權 Sovereignty", desc: "保障各成員國的主權完整與平等地位。" },
              { icon: Scale, title: "調解爭端 Mediation", desc: "提供中立平台，以和平方式解決國際爭端。" }
            ].map((pillar, i) => (
              <motion.div key={i} variants={item}>
                <Card className="h-full border-none shadow-md hover:shadow-lg transition-shadow bg-white text-center p-6">
                  <CardContent className="pt-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <pillar.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-primary">{pillar.title}</h3>
                    <p className="text-foreground/70">{pillar.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Main Organs */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">主要機構 Main Organs</h2>
            <div className="w-16 h-1 bg-secondary mx-auto mb-6" />
            <p className="text-foreground/70 max-w-2xl mx-auto">依據《聯合微國家組織憲章》，本組織設立三大常設機構以維持日常運作與決策。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="overflow-hidden border-border/50 hover:border-secondary/50 transition-colors">
              <div className="bg-primary p-4 text-center">
                <h3 className="text-xl font-bold text-primary-foreground">議事中心</h3>
                <p className="text-primary-foreground/80 text-sm">Deliberation Center</p>
              </div>
              <CardContent className="p-6">
                <p className="text-foreground/80 mb-4">
                  組織的最高權力與議事機構。每個成員國可派遣代表參與，行使提案、表決與發言權，決定組織的重大方針與決議。
                </p>
                <ul className="list-disc list-inside text-sm text-foreground/70 space-y-2 ml-4">
                  <li>一國一票，公開唱名表決</li>
                  <li>選舉及罷免秘書長</li>
                  <li>處理成員國入聯與升格申請</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/50 hover:border-secondary/50 transition-colors">
              <div className="bg-primary p-4 text-center">
                <h3 className="text-xl font-bold text-primary-foreground">秘書處</h3>
                <p className="text-primary-foreground/80 text-sm">Secretariat</p>
              </div>
              <CardContent className="p-6">
                <p className="text-foreground/80 mb-4">
                  組織的常設行政機構，由秘書長領導。負責對外代表組織，並維持議事中心的日常運作與執行決議。
                </p>
                <ul className="list-disc list-inside text-sm text-foreground/70 space-y-2 ml-4">
                  <li>維持議事運作與檔案管理</li>
                  <li>組織文化及交流活動</li>
                  <li>維護組織秩序與憲章執行</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/50 hover:border-secondary/50 transition-colors">
              <div className="bg-primary p-4 text-center">
                <h3 className="text-xl font-bold text-primary-foreground">理事會</h3>
                <p className="text-primary-foreground/80 text-sm">Council</p>
              </div>
              <CardContent className="p-6">
                <p className="text-foreground/80 mb-4">
                  負責維持議事中心的秩序與流程。理事國負責主持會議，並在特殊情況下有權要求召開特別會議。
                </p>
                <ul className="list-disc list-inside text-sm text-foreground/70 space-y-2 ml-4">
                  <li>指派議事中心主席與副主席</li>
                  <li>處理突發危機與緊急事務</li>
                  <li>協助秘書處執行決議</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 bg-primary text-primary-foreground text-center px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">加入我們的行列</h2>
          <p className="text-xl text-white/80 mb-10">
            無論是成熟的微國家還是新興的主權實體，FUMO 都歡迎您加入這個多元、包容的國際社群。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/regulations">
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-primary font-bold min-w-[200px] h-14 text-lg">
                查閱入聯法規
              </Button>
            </Link>
            <Link href="/members">
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary min-w-[200px] h-14 text-lg">
                瀏覽現有成員
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
