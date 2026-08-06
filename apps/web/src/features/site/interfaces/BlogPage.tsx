import { usePosts } from "@/features/site/application/hooks";
import { Badge, Card } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function BlogPage() {
  const { t } = useTranslation("site");
  const posts = usePosts();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-label text-gold-700">
          {t("blogPage.eyebrow")}
        </span>
        <h1 className="mt-1 font-display text-3xl font-semibold text-navy sm:text-4xl">
          {t("blogPage.title")}
        </h1>
        <p className="mt-3 text-ink-soft">{t("blogPage.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <Link key={post.id} to={`/blog/${post.slug}`}>
            <Card className="transition-shadow hover:shadow-elevated">
              <Badge variant="gold" className="mb-2">
                {post.categoria}
              </Badge>
              <h2 className="font-display text-lg font-semibold text-navy">{post.titulo}</h2>
              <p className="mt-1 text-sm text-ink-soft">{post.resumo}</p>
              <p className="mt-2 text-xs text-ink-muted">
                {new Date(post.publicadoEm).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
