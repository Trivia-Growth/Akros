import { usePost } from "@/features/site/application/hooks";
import { Badge, Button } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

export function BlogPostPage() {
  const { t } = useTranslation("site");
  const { slug } = useParams<{ slug: string }>();
  const post = usePost(slug);

  if (post === null) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-ink-muted">{t("blogPage.notFound")}</p>
        <Link to="/blog" className="mt-4 inline-block">
          <Button variant="secondary">{t("blogPage.back")}</Button>
        </Link>
      </div>
    );
  }

  if (!post) return null;

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <Link to="/blog" className="text-sm text-gold-700 hover:underline">
        ← {t("blogPage.back")}
      </Link>
      <Badge variant="gold" className="mb-3 mt-6">
        {post.categoria}
      </Badge>
      <h1 className="font-display text-3xl font-semibold text-navy">{post.titulo}</h1>
      <p className="mt-2 text-xs text-ink-muted">
        {new Date(post.publicadoEm).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </p>
      <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-soft">{post.conteudo}</p>
    </article>
  );
}
