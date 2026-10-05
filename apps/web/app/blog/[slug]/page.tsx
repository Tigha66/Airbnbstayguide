import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/components/marketing";
import { articles } from "@/lib/articles";
export function generateStaticParams() {
  return articles.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  return { title: article?.title, description: article?.excerpt };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();
  return (
    <div className="marketing">
      <MarketingNav />
      <article className="article">
        <div className="eyebrow">{article.category}</div>
        <h1>{article.title}</h1>
        <p>{article.excerpt}</p>
        {article.body.map(([title, body]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
        <Link className="button" href="/dashboard">
          Give your guests a better guide ↗
        </Link>
      </article>
      <MarketingFooter />
    </div>
  );
}
