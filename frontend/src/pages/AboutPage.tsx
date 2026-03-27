import { Github, Linkedin, Mail, Code, Layout } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TraefikIcon, KubernetesIcon, ReactIcon, TailwindIcon, ViteIcon, GoIcon, ShadcnIcon } from '@/components/BrandIcons';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Maintained by</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Creator and maintainer of Pre Rup Traefik Manager.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ── Profile Card ─────────────────────────────────────────────────── */}
        <Card className="col-span-1 border-border bg-card overflow-hidden relative">
          <div className="h-24 w-full bg-gradient-to-br from-primary/80 to-indigo-600/80 absolute top-0 left-0" />
          <CardContent className="pt-12 pb-6 px-6 relative z-10 flex flex-col items-center text-center">
            {/* Avatar placeholder — user can replace src with their real image */}
            <div className="h-24 w-24 rounded-full border-4 border-background bg-muted shadow-sm overflow-hidden mb-4 relative flex items-center justify-center">
              <img 
                src="https://github.com/cakeru.png" 
                alt="Chhousour LEOK" 
                className="h-full w-full object-cover"
              />
            </div>
            
            <h3 className="text-xl font-bold text-foreground">Chhousour LEOK</h3>
            <p className="text-sm font-medium text-primary mt-1">DevOps Engineer & Full Stack Developer</p>
            
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Passionate about Kubernetes, cloud-native architecture, and building intuitive developer tools.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-6 w-full">
              <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                <a href="https://github.com/cakeru" target="_blank" rel="noreferrer">
                  <Github className="h-4 w-4" /> GitHub
                </a>
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                <a href="https://www.linkedin.com/in/chousour/" target="_blank" rel="noreferrer">
                  <Linkedin className="h-4 w-4 text-blue-500" /> LinkedIn
                </a>
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                <a href="mailto:chousourleok@gmail.com">
                  <Mail className="h-4 w-4 text-rose-500" /> Email Me
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Project Details & Tech Stack ──────────────────────────────────── */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
                <Layout className="h-5 w-5 text-indigo-400" />
                About Traefik Manager
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Traefik Manager is a modern, reactive dashboard designed to simplify the management of Traefik Proxy resources on Kubernetes. It provides a visual interface for HTTP and TCP routing, middleware configuration, TLS options, and cluster-wide observability — taking the pain out of hand-writing YAML manifests.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-4">
                <li>Real-time visualization of network topology and traffic flows.</li>
                <li>Native support for Gateway API, IngressRoutes, and TraefikServices.</li>
                <li>Built-in validation for CRDs to prevent misconfigurations.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6 text-foreground">
                <Code className="h-5 w-5 text-teal-400" />
                Built With
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Frontend */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frontend</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-[#61DAFB]">
                      <ReactIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">React</div>
                      <div className="text-xs text-muted-foreground">With TypeScript</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-[#646CFF]">
                      <ViteIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Vite</div>
                      <div className="text-xs text-muted-foreground">Lightning Fast Build</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-[#06B6D4]">
                      <TailwindIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Tailwind CSS</div>
                      <div className="text-xs text-muted-foreground">Utility-first Styling</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/10 text-foreground">
                      <ShadcnIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">shadcn/ui</div>
                      <div className="text-xs text-muted-foreground">Component System</div>
                    </div>
                  </div>
                </div>

                {/* Backend & Infra */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Platform</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-[#00ADD8]">
                      <GoIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Go (Golang)</div>
                      <div className="text-xs text-muted-foreground">Backend API</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                      <KubernetesIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Kubernetes</div>
                      <div className="text-xs text-muted-foreground">Client-Go Integration</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <TraefikIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Traefik</div>
                      <div className="text-xs text-muted-foreground">v3 Provider CRM API</div>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
